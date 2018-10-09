/*
Lots of parsing utils can be found here
https://github.com/jpmayer/fantasy-chrome-extension/blob/master/js/popup.js
*/

/*
leagueSettings
playerInfo
scoreboard -- TODO: issues
? player/news
recentActivity -- TODO: issues
leagueSchedules
teams
rosterInfo
schedule
? teams/pendingMoveBatches
? boxscore
*/


/*
If you exceed the greatest matchupPeriodId available - the api will return the largest id available (so, basically week 16+playoffs?) TODO: Please integration test this theory for every year
*/

const axios = require('axios');
const fs = require('fs');
const path = require('path');

let endpoints = [
    'leagueSettings',
    /*'playerInfo',
    'leagueSchedules',
    'teams',
    // rosterInfo api didn't exist in 2015 && 2016
    'schedule',*/
  ];

init = (leagueId, yearToStart, cb) => { // TODO: Make it so we're not requesting this once for settings and once for data saving

  if(yearToStart <= 2007) {
    console.error("Can't grab anything before 2007 because the api has bad memory.")
    return;
  }

  axios.get('http://games.espn.com/ffl/api/v2/leagueSettings?leagueId=277531')
    .then((response) => {
      // Get a list of seasons for us to check for
      // TODO: Figure out how to parse amount of playoff games and add number to amount of weeks to loop through
      // TODO: Retrieve this first for every season -- leagues can modify the amount of matchups per season
      // TODO: Most leagues don't need settings checked for every week - but some probably do. Figure out how to handle this
      // The reason they might is that settings could have changed between weeks
      let finalRegularSeasonMatchupPeriodId = response.data.leaguesettings.finalRegularSeasonMatchupPeriodId;
      let season = yearToStart;

      /*
      Nested loops: For every endpoint IN every matchupPeriod IN every season
      */
      while(season < 2018) { // TODO: Don't hardcode this year
        let promises = [];
        let endpointData = {};
        endpoints.forEach((endpoint) => {
          let matchupPeriod = 0;
          while (matchupPeriod < finalRegularSeasonMatchupPeriodId) {
            matchupPeriod++;

            //endpointData[matchupPeriod] = endpointData[matchupPeriod] ? endpointData[matchupPeriod] : {};
            // For debugging w/o hitting API only
            // console.log('Executing getting for endpoint:', endpoint, 'season:', season, 'matchupPeriod:' ,matchupPeriod);
            // endpointData[matchupPeriod] = executeGetting(endpoint, leagueId, season, matchupPeriod);
            promises.push(executeGetting(endpoint, leagueId, season, matchupPeriod));
          }

        });

        Promise.all(promises).then((values) => {
            values.forEach((v) => {
                let matchupPeriodId = v.matchupPeriodId;
                let endpoint = v.endpoint;
                endpointData[matchupPeriodId] = endpointData[matchupPeriodId] ? endpointData[matchupPeriodId] : {}; // if there is no matchupperiod, create it so we don't get undefined
                endpointData[matchupPeriodId][endpoint] = v[matchupPeriodId]; 
            });
            writeToFile(leagueId, season, endpointData);
        });

        season++;
      }
      cb();
    });
};

executeGetting = (endpoint, leagueId, season, matchupPeriod) => {
    let promise = axios.get('http://games.espn.com/ffl/api/v2/'+endpoint, {
        params: {
            leagueId: leagueId,
            seasonId: season,
            matchupPeriodId: matchupPeriod,
            endpoint: endpoint,
        }
        // Adding endpoint is a hack to access it later in the response. Bad idea, I know.
    })
    .then((response) => {
        return {
            'matchupPeriodId': response.config.params.matchupPeriodId,
            'endpoint': response.config.params.endpoint,
            [response.config.params.matchupPeriodId]: response.data
            }
    })
    .catch((error) => {
        console.warn('Error requesting data for', endpoint, leagueId, season, matchupPeriod, error);
        return new Error('Botched request on endpoint for season', season, 'matchupPeriod', matchupPeriod, 'and endpoint', endpoint, 'error:', error);
    });
    return promise;
};

// TODO:NEXT - Implement promise/async
writeToFile = (leagueId, season, data) => {
  let filename = season+'.json';
  let topLevelDir = 'data';

  mkDirByPathSync(topLevelDir, {isRelativeToScript: true})

  let writeStream = fs.createWriteStream(topLevelDir + '/' + filename);
  writeStream.on('finish', () => {
    console.log('finished writing', filename)
    writeStream.end('ending writestream');
  });
    writeStream.write(JSON.stringify(data));
};


// Taken from SOF: https://stackoverflow.com/a/31645803
 mkDirByPathSync = (targetDir, { isRelativeToScript = false } = {}) => {
  const sep = path.sep;
  const initDir = path.isAbsolute(targetDir) ? sep : '';
  const baseDir = isRelativeToScript ? __dirname : '.';

  return targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(baseDir, parentDir, childDir);
    try {
      fs.mkdirSync(curDir);
    } catch (err) {
      if (err.code === 'EEXIST') { // curDir already exists!
        return curDir;
      }

      // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
      if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
        throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
      }

      const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
      if (!caughtErr || caughtErr && targetDir === curDir) {
        throw err; // Throw if it's just the last created dir.
      }
    }

    return curDir;
  }, initDir);
};

init(277531, 2015, (er) => {console.log('Done!')});
