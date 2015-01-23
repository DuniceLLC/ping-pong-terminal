var config  = require('./config.js');
var referee = require('./referee.js');

process.env.DEBUG = '*';

referee.run({
    port: config.refereePort
});