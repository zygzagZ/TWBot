var http = require('http');
function Request(config) { // {url, cookies, callback, data, previousHost, previousDirectory,
	var protocolPos = config.url.indexOf('//');
	var hostPos, hostname, path;
	if (protocolPos >= 0) {
		config.url = config.url.substr(protocolPos+2);
		hostPos = config.url.indexOf('/');
		hostname = config.url;
		path = '/';
	} else {
		hostname = config.previousHost;
		if (!config.url.startsWith('/'))
			path = config.previousDirectory + config.url;
		else
			path = config.url;
		
	}
	if (hostPos >= 0) {
		hostname = config.url.substr(0,hostPos);
		path = config.url.substr(hostPos);
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
		
	var cookiesString = config.cookies.getCookiesString(hostname, directory);
	if (cookiesString.length) {
		options.headers.Cookie = cookiesString;
	}
	var req = http.request(options, function(res) {
		console.log('\n\nURL:' + config.url + '\nSTATUS: ' + res.statusCode);
		console.log('HEADERS: ' + JSON.stringify(res.headers));
		if (res.headers['set-cookie']) {
			config.cookies.parse(res.headers['set-cookie']);
		}
		if (!config.noRedirects && res.headers.location) {
			config.previousHost = hostname;
			config.previousDirectory = directory;
			config.url = res.headers.location;
			return Request(config);
		}
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			console.log('BODY: ' + chunk.substr(0, 1000));
		});
	});

	req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});
	req.end();
		
}



module.exports = {
	Request: Request,
}