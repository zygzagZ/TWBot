global.include = function(name) {
    return require(__dirname + '/' + name);
}
include('classes/utility');
var loadConfig = include('classes/configloader'),
	Player = include('classes/player');

	
loadConfig(function(config) {
	var l = 0;
	for (var i = 0; i < config.length; i++) {
		console.log("Loading player " + config[i].username);
		setTimeout(function(a) {new Player(a);}, l, config[i]);
		l += 1500 + Math.random()*2500;
	}
})