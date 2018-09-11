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
let axios = require('axios');
let fs = require('fs');

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
            console.log('Deep loop on', endpoint, leagueId, season, matchupPeriod)
            // executeGetting(endpoint, leagueId, season, matchupPeriod);
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
  console.log('executing getting')
  axios.get('http://games.espn.com/ffl/api/v2/', {
    params: {
      endpoint: endpoint,
      leagueId: leagueId,
      season: season,
      matchupPeriod: matchupPeriod,
    }
  })
    .then((response) => {
      console.log('recieved response')
      let fileName = leagueId+'-'+season+'-'+matchupPeriod+'-'+endpoint+'.log.json';
      let writeStream = fs.createWriteStream(fileName);
      writeStream.write(response.data);
      writeStream.on('finish', () => {
        console.log('finished writing', fileName)
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


init(277531, 2017, () => {console.log('DonE!')});