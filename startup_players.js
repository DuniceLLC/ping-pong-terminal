var cluster = require('cluster');
var _       = require('lodash');
var config  = require('./config.js');
var player  = require('./player.js');

var startWorkerPort = 3001;

process.env.DEBUG = _.pluck(config.players, 'name').join(',');

if (cluster.isMaster) {

    // Fork workers.
    for (var i = 0; i < config.players.length; i++) {
        cluster.fork({
            worker_id: i
        });
    }

    cluster.on('exit', function (worker, code, signal) {
        console.log('Worker ' + worker.process.pid + ' died');
    });
} else {
    var workerId = parseInt(process.env.worker_id, 10)
    player.run(config.players[workerId]);

}