var globalConfig = include('config.json'),
	RawRequest = include('classes/net');
module.exports = function(callback) {
	 if (globalConfig['email-link']) {
		console.log('Rewriting config values from email-link...');
		var url = globalConfig['email-link'];
		if (url.indexOf('login.php') > 0 && url.indexOf('user=') > 0 && url.indexOf('password=') > 0) {
			var config = {
				"username": url.match(/user=([^&]+)&/)[1],
				"password": url.match(/password=([^&]+)&/)[1],
				"world": ~~url.match(/http:\/\/[a-z]*([0-9]+)\./)[1], 
			};
			var fs = require('fs');
			fs.writeFile('./config.json', JSON.stringify(config), function(err) {
				if (err) throw err;
				callback(config);
			});
			return;
		}
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
			},
			onRedirectTest: function(url) {
				if (url.indexOf('login.php') > 0 && url.indexOf('user=') > 0 && url.indexOf('password=') > 0) {
					var config = {
						"username": url.match(/user=([^&]+)&/)[1],
						"password": url.match(/password=([^&]+)&/)[1],
						"world": ~~url.match(/http:\/\/[a-z]*([0-9]+)\./)[1], 
					};
					var fs = require('fs');
					fs.writeFile('./config.json', JSON.stringify(config), function(err) {
						if (err) throw err;
						callback(config);
					});
					return false; // don't log in yet
				}
				return true;
			}
		})
	} else {
		callback(globalConfig);
	}
}