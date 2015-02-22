global.include = function(name) {
    return require(__dirname + '/' + name);
}
include('classes/utility');
var loadConfig = include('classes/configloader'),
	Player = include('classes/player');

	
loadConfig(function(config) {
	var player = new Player(config);
})