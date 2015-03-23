var http = require('http');
function Request(config) { // url, cookies, callback, data, previousHost, previousDirectory, onRedirectTest
	var hostPos, hostname, path, url = config.url, protocolPos = url.indexOf('//');
	if (protocolPos >= 0) {
		url = url.substr(protocolPos+2);
		hostPos = url.indexOf('/');
		hostname = url;
		path = '/';
	} else {
		hostname = config.previousHost;
		if (!url.startsWith('/')) {
			path = config.previousDirectory + url;
		} else {
			path = url;
		}
	}
	if (hostPos >= 0) {
		hostname = url.substr(0,hostPos);
		path = url.substr(hostPos);
	}
	if (typeof(config.data) == 'Object') 
		config.data = querystring.stringify(config.data);
	
	var pathDirectoryEnd = path.findLast('/', Math.min(path.find('?'), path.find('#'), path.length)), directory;
	directory=path.substr(0, pathDirectoryEnd+1);
	
	var options = {
		hostname: hostname,
		path: path,
		method: config.data ? 'POST' : 'GET',
		headers: {
			'Accept': 'text/html,application/xhtml+xml,application/xml',
			'DNT': 1,
			'Cache-control':'no-cache',
			'Host': hostname,
			'Pragma': 'no-cache',
		}
	}
	if (config.userAgent && config.userAgent.length)
		options.headers['User-Agent'] = config.userAgent;
	
	if (config.data) {
		options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
	    options.headers['Content-Length'] = config.data.length;
	}
		
	if (config.cookies) {
		var cookiesString = config.cookies.getCookiesString(hostname, directory);
		if (cookiesString.length) {
			options.headers.Cookie = cookiesString;
		}
	}
	try {
		var req = http.request(options, function(res) {
			console.log(res.statusCode,'||', url);
			//console.log('HEADERS: ' + JSON.stringify(res.headers));
			if (res.headers['set-cookie'] && config.cookies) {
				config.cookies.parse(res.headers['set-cookie']);
			}
			if (res.headers.location) {
				if (!config.onRedirectTest || config.onRedirectTest(res.headers.location)) {
					Request({url: res.headers.location, previousHost: hostname, previousDirectory: directory, onRedirectTest: config.onRedirectTest, callback: config.callback, cookies: config.cookies});
				}
				return;
			}
			res.setEncoding('utf8');
			var data = '';
			res.on('data', function (chunk) {
				data += chunk;
			}).on('end', function() {
				if (config.callback) {
					config.callback(data, url);
				}
			}).on('error', function(a,b,c) {
				console.log('onerror', a,b,c);
			});
		});

		req.on('error', function(e) {
			console.log('problem with request: ' + e.message);
		});
		req.end();
	} catch(e) {
		console.error(e, JSON.stringify(options));
	}
}

module.exports = Request;
