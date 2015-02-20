require('./classes/string');
var globalConfig = require('./config.json'),
	Player = require('./classes/player');
	
var player = new Player(globalConfig);
