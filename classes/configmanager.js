var globalConfig = include('config.json'),
	RawRequest = include('classes/net'),
	fs = require('fs');

var configs = {};
function save() {
	for (var fileName in configs) {
		fs.writeFileSync(fileName, JSON.stringify(configs[fileName]));
	}
}
process.on('SIGINT', process.exit.bind(process, 0));
process.on('exit', save);

function getConfigFileName(type) {
	if (type[0] === 'p') {
		return './data/player.' + type.substr(1) + '.json';
	} else if (type[0] === 'w') {
		return './data/world.' + type.substr(1) + '.json';
	}
}
function loadConfig(type, callback) {
	var fileName = getConfigFileName(type);
	fs.readFile(fileName, function(error, content) {
		var config = {};
		if (!error) {
			config = JSON.parse(content);
		} 
		callback(config);
		configs[fileName] = config;
	});
}
function loadGlobalConfig(callback) { // TODO: manage various types of configs, eg global, per player and maybe even per village
	function onFinish() {
		fs.writeFile('./config.json', JSON.stringify(globalConfig), function(err) {
			if (err) { throw err; }
			callback(globalConfig);
		});
	}
	var num = 0, update = false;
	for (var i in globalConfig) {
		var node = globalConfig[i];
		if (node['email-link']) {
			console.log('Rewriting config values from email-link...');
			var url = node['email-link'];
			if (url.indexOf('login.php') > 0 && url.indexOf('user=') > 0 && url.indexOf('password=') > 0) {
				if (!(node.world instanceof Array)) {
					node.world = [];
				}
				node.world.push(parseInt(url.match(/http[s]*:\/\/[a-z]*([0-9]+)\./)[1], 10));
				node.extend({
					'username': url.match(/user=([^&]+)&/)[1],
					'password': url.match(/password=([^&]+)&/)[1],
				});
				update = true;
				delete node['email-link'];
				continue;
			}
			num++;
			RawRequest({
				url: url,
				callback: function(str) {
					if (str === 'Bad request') {
						console.error('You have provided bad email-link!');
					} else if (str.indexOf('TribalWars') > 0) {
						console.error('Logged in, but login data not found!');
					} else {
						console.error('Unknown error when resolving email-link. Printing data got');
						console.log(str);
					}
					if (num-- === 1) {
						onFinish();
					}
				},
				onRedirectTest: function(url) {
					if (url.indexOf('login.php') > 0 && url.indexOf('user=') > 0 && url.indexOf('password=') > 0) {
						if (!(node.worlds instanceof Array)) {
							node.worlds = [];
						}
						node.worlds.push(parseInt(url.match(/http:\/\/[a-z]*([0-9]+)\./)[1], 10));
						node.extend({
							'username': url.match(/user=([^&]+)&/)[1],
							'password': url.match(/password=([^&]+)&/)[1],
						});
						delete node['email-link'];
						if (num-- === 1) {
							onFinish();
						}
						return false; // don't log in yet
					}
					return true;
				}
			});
		}
	}
	if (num===0) {
		if (update) {
			onFinish();
		} else {
			callback(globalConfig);
		}
	}
};

module.exports = function(type, callback) {
	if (type === 'global') {
		loadGlobalConfig(callback);
	} else {
		loadConfig(type, callback);
	}
}