var globalConfig = include('config.json'),
	RawRequest = include('classes/net');
	
module.exports = function(type, callback) { // TODO: manage various types of configs, eg global, per player and maybe even per village
	function onFinish() {
		require('fs').writeFile('./config.json', JSON.stringify(globalConfig), function(err) {
			if (err) throw err;
			callback(globalConfig);
		});
	}
	var num = 0, update = false;;
	for (var i in globalConfig) {
		var node = globalConfig[i];
		if (node['email-link']) {
			console.log('Rewriting config values from email-link...');
			var url = node['email-link'];
			if (url.indexOf('login.php') > 0 && url.indexOf('user=') > 0 && url.indexOf('password=') > 0) {
				if (!node.world instanceof Array) {
					node.world = [];
				}
				node.world.push(~~url.match(/http:\/\/[a-z]*([0-9]+)\./)[1]);
				node.extend({
					"username": url.match(/user=([^&]+)&/)[1],
					"password": url.match(/password=([^&]+)&/)[1],
				});
				update = true;
				delete node['email-link'];
				continue;
			}
			num++;
			RawRequest({
				url: url,
				callback: function(str) {
					if (str == 'Bad request') {
						console.error('You have provided bad email-link!');
					} else if (str.indexOf('TribalWars') > 0) {
						console.error('Logged in, but login data not found!');
					} else {
						console.error('Unknown error when resolving email-link. Printing data got');
						console.log(str);
					}
					if (num-- == 1) {
						onFinish();
					}
				},
				onRedirectTest: function(url) {
					if (url.indexOf('login.php') > 0 && url.indexOf('user=') > 0 && url.indexOf('password=') > 0) {
						if (!node.worlds instanceof Array) {
							node.worlds = [];
						}
						node.worlds.push(~~url.match(/http:\/\/[a-z]*([0-9]+)\./)[1]);
						node.extend({
							"username": url.match(/user=([^&]+)&/)[1],
							"password": url.match(/password=([^&]+)&/)[1],
						});
						delete node['email-link'];
						if (num-- == 1) {
							onFinish();
						}
						return false; // don't log in yet
					}
					return true;
				}
			})
		}
	}
	if (num===0) {
		if (update) {
			onFinish()
		} else {
			callback(globalConfig);
		}
	}
}
