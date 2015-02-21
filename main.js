require('./classes/string');
var loadConfig = require('./classes/configloader'),
	Player = require('./classes/player');

	
loadConfig(function(config) {
	var player = new Player(config);
})
