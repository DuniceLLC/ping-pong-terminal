var assert  = require('assert');
var restify = require('restify');
var debug   = require('debug');
var _       = require('lodash');
var config  = require('./config.js');

function Player(options) {
    var self = this;
    _.extend(this, options);
    this.log = debug(this.name);

    this.server = restify.createServer({
        name: this.name
    });

    this.bindRoutes();
    this.server.listen(this.port, function() {
        self.log('Listening server');
    });

    this.client = restify.createJsonClient({
        url: config.refereeURL
    });

    return this;
}

Player.prototype = {

    _wrapKey: function (object) {
        return _.extend(object, {accessKey: this.accessKey})
    },

    bindRoutes: function() {
        var self = this;
        this.server.use(restify.bodyParser({ mapParams: true }));
        this.server.post('/notification', function(req, res) {
            self.log('Got notification', req.params.message);
            res.send(200);
        });
    },

    connect: function() {
        var self = this;
        this.client.post('/welcome', this._wrapKey({
            name: this.name,
            accessKey: this.accessKey,
        }), function(err, req, res, obj) {
            assert.ifError(err);
            self.log('Participating in a tournament with ID:', obj.tournamentId)
        });
    }

}


module.exports = {
    run: function (options) {
        var player = new Player(options);
        player.connect();
        return player;
    }
}