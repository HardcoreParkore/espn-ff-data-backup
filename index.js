/*
leagueSettings
playerInfo
scoreboard
? player/news
recentActivity
leagueSchedules
teams
rosterInfo
schedule
? teams/pendingMoveBatches
? boxscore
*/


/*
If you exceed the greatest matchupPeriodId available - the api will return the largest id available (so, basically week 16)
*/
const axios = require('axios');
const fs = require('fs');
const path = require('path');

let endpoints = [
    'leagueSettings',
    'playerInfo',
    'scoreboard',
    'recentActivity',
    'leagueSchedules',
    'teams',
    'rosterInfo',
    'schedule',
  ];

// TODO: Limit yearToStart to <= 2007
init = (leagueId, yearToStart, cb) => { // TODO: Make it so we're not requesting this twice
  axios.get('http://games.espn.com/ffl/api/v2/leagueSettings?leagueId=277531')
    .then((response) => {
      // Get a list of seasons for us to check for
      //let data = JSON.parse(response.data);
      let finalRegularSeasonMatchupPeriodId = response.data.leaguesettings.finalRegularSeasonMatchupPeriodId;
      let season = yearToStart;


      /*
      Nested loops:
      For every endpoint IN every matchupPeriod IN every season
      * */
      while(season < 2018) { // TODO: Don't hardcode this year
        let matchupPeriod = 12; // TODO: Reset to 0
        console.log('upper level loop')
        while(matchupPeriod < finalRegularSeasonMatchupPeriodId) {
          matchupPeriod++;

          endpoints.forEach((endpoint) => {
            //console.log('Deep loop on', endpoint, leagueId, season, matchupPeriod)
              executeGetting(endpoint, leagueId, season, matchupPeriod);
          })
        }
        season++
      }
      cb()
  })


};

getUrl = (endpoint, leagueId, season, matchupPeriod) => {
  return 'http://games.espn.com/ffl/api/v2/' + endpoint
    + '?leagueId=' + leagueId
    + '&seasonId=' + season
    + '&matchupPeriodId=' + matchupPeriod
};

executeGetting = (endpoint, leagueId, season, matchupPeriod) => {
  console.log('executing getting against', endpoint, season, matchupPeriod)
  axios.get('http://games.espn.com/ffl/api/v2/'+endpoint, {
    params: {
      leagueId: leagueId,
      seasonId: season,
      matchupPeriodId: matchupPeriod,
    }
  })
  .then((response) => {
    let filename = endpoint+'-'+season+'-'+matchupPeriod+'.json';
    let topLevelDir = 'backup-'+leagueId+'/'+season+'/'
    let writeStream = fs.createWriteStream(path);
    writeStream.write(JSON.stringify(response.data));
    writeStream.on('finish', () => {
      console.log('finished writing', path)
      writeStream.end();
    });
    // console.log(response)
  })
  .catch((error) => {
    console.warn(error);
  })
  .then(() => {
    // execute next call?
  });
};

createFilesIfNotExists = (endpoint, leagueId, season, matchupPeriod) => {
  ensureExists('./backup-'+leagueId+'/test/test', (err) => {
    console.log('done', err)
    if(err) {
      fs.mkdir('./backup-'+leagueId+'/test/test')
    }
  })
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

init(277531, 2017, () => {console.log('DonE!')});
