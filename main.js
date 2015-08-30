#!/usr/bin/nodejs
global.include = function(name) {
    return require(__dirname + '/' + name);
}
include('classes/utility');
var loadConfig = include('classes/configmanager'),
	Player = include('classes/player'),
	httpServer = include('classes/httpserver');

var players = [];	
loadConfig('global', function(config) {
	var l = 0;
	if (!config.length) {
		console.error('No config length!');
		return;
	}
	var g = config[0];
	for (var i = 1; i < config.length; i++) {
		console.log("Loading player " + config[i].username);
		setTimeout(function(a) {
			var p = new Player(a);
			players.push(p);
		}, l, config[i]);
		l += 1500 + Math.random()*2500;
	}
	if (g.httpserver && (typeof g.httpserver === 'object')) {
		if (false !== g.httpserver.enabled) {
			httpServer(g.httpserver.extend({players:players}));
		}
	}
})
module.exports = players;
