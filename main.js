global.include = function(name) {
    return require(__dirname + '/' + name);
}
include('classes/utility');
var loadConfig = include('classes/configloader'),
	Player = include('classes/player'),
	httpServer = include('classes/httpserver');

var players = [];	
loadConfig(function(config) {
	var l = 0;
	for (var i = 0; i < config.length; i++) {
		console.log("Loading player " + config[i].username);
		setTimeout(function(a) {
			var p = new Player(a);
			players.push(p);
		}, l, config[i]);
		l += 1500 + Math.random()*2500;
	}
	httpServer({players:players});
})
module.exports = players;
