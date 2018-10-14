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

const axios = require('axios');
const fs = require('fs');
const path = require('path');

let endpoints = [
    'teams',
];

init = (leagueId, yearToStart, cb) => {

  if(yearToStart <= 2007) {
    console.error("Can't grab anything before 2007 because the api has bad memory.")
    return;
  }

  let season = yearToStart;
  let endpointData = {};

  while(season <= 2018) { // TODO: Don't hardcode this year
    let promise = retrieveTeamsData(leagueId, season)
    promise.then((response) => {
        writeToFile(response.seasonId, response.data)
      });
    season++
  }

  cb();
};

retrieveTeamsData = (leagueId, seasonId) => {
  let promise = axios.get('http://games.espn.com/ffl/api/v2/teams', {
    params: {
      leagueId: leagueId,
      seasonId: seasonId,
    }
  }).then((response) => {
    return {
      'seasonId': response.config.params.seasonId,
      'data': response.data,
    }
  })
  return promise;
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

writeToFile = (season, data) => {
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
