var assert  = require('assert');
var restify = require('restify');
var debug   = require('debug');
var _       = require('lodash');
var async   = require('async');
var util    = require('util');
var EventEmitter = require('events').EventEmitter;
var config  = require('./config.js');

function PlayerClient(options) {
    this.log = debug('PlayerClient:' + this.name);

    _.extend(this, options);

    this.client = restify.createJsonClient({
        url: 'http://localhost:' + this.port + '/'
    });
}

PlayerClient.prototype = {
    notification: function(info, callback) {
        var self = this;
        this.client.post('/notification', info, function(err, req, res, obj) {
            callback && callback(err);
        });
    }
}

function Game(attacker, defender) {
    this.id = Math.random().toString().slice(2);
    this.attacker = attacker;
    this.defender = defender;
}

Game.prototype.start = function() {

}


function Tournament() {
    this.id = Math.random().toString().slice(2);
    this.log = debug('Tournament:' + this.id);
    this.players = [];
    this.isStarted = false;
    this.table = null;
    this.on('tick', this.nextTick);
}

util.inherits(Tournament, EventEmitter);


Tournament.prototype.addPlayer = function(player) {
    var self =
        this;
    if (!_.find(this.players, {accessKey: player.accessKey})) {
        this.players.push(player);
        return true;
    } else {
        return false;
    }
}

Tournament.prototype._generateTable = function() {
    var self = this;
    this.table = _.shuffle(this.players);
    this.table = _.map(_.range(Math.floor(this.players.length / 2)), function(index) {
        return [self.players[2 * index], self.players[2 * index + 1]]
    });
}


Tournament.prototype.start = function() {
    var self = this;
    if (this.isStarted) {
        return false;
    }
    if (this.players.length !== config.players.length) {
        return false;
    }
    this._generateTable();
    async.eachSeries(this.players, function (player, cb) {
        player.notification({
            message: ['Your', this.id, 'started'].join(' ')
        }, cb)
    }, function(errors, results) {
        self.log('everybody notified')
        self.isStarted = true;
    });
}


Tournament.prototype.nextTick = function() {

}




function Referee(options) {
    var self = this;
    this.options = options;
    this.log = debug('Referee');

    this.tournament = new Tournament()

    this.server = restify.createServer({
        name: 'Referee'
    });
    this.bindRoutes();
    this.server.listen(this.options.port, function() {
        self.log('Listening server');
    });

    return this;
}

Referee.prototype = {

    bindRoutes: function() {
        var self = this;

        this.server.use(restify.bodyParser({ mapParams: true }));
        this.server.use(function (req, res, next) {

            var accessKey = req.params.accessKey;

            if (_.isUndefined(accessKey)) {
                return next(new Error('accessKey not specified'));
            }
            //
            var player = _.find(config.players, {accessKey: accessKey});

            if (!player) {
                return next(new Error('No users with given accessKey found'));
            }

            req.player = new PlayerClient(player);

            return next();
        });

        this.server.post('/welcome', function(req, res, next) {
            self.log('User connection attempt', req.player.name);

            var status = self.tournament.addPlayer(req.player);

            if (!status) {
                return next(new Error('Player is in a tournament already'));
            } else {
                res.json(200, {
                    tournamentId: self.tournament.id
                });
                self.tournament.start();
            }

        });

    }

}


module.exports = {
    run: function (options) {
        return new Referee(options);
    }
}