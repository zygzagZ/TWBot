module.exports = {
	Request: function(url, config, callback, data) {
		if (!config) config = {};
		var protocolPos = url.indexOf('//');
		var hostPos, hostname, path;
		if (protocolPos >= 0) {
			url = url.substr(protocolPos+2);
			hostPos = url.indexOf('/');
			hostname = url;
			path = '/';
		} else {
			hostname = config.previousHost;
			if (!url.startsWith('/'))
				path = config.previousDirectory + url;
			else
				path = url;
			
		}
		if (hostPos >= 0) {
			hostname = url.substr(0,hostPos);
			path = url.substr(hostPos);
		}
		if (typeof(data) == 'Object') 
			data = querystring.stringify(data);

		var pathDirectoryEnd = path.findLast('/', Math.min(path.find('?'), path.find('#'), path.length)), directory;
		directory=path.substr(0, pathDirectoryEnd+1);
		
		var options = {
			hostname: hostname,
			path: path,
			method: data ? 'POST' : 'GET',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml',
				'DNT': 1,
				'Cache-control':'no-cache',
				'Host': 'pl'+globalConfig.world+'.plemiona.pl',
				'Pragma': 'no-cache',
			}
		}
		if (config.userAgent && config.userAgent.length)
			options.headers['User-Agent'] = config.userAgent;
		
		if (data) {
			options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
		    options.headers['Content-Length'] = data.length;
		}
		
		var cookiesString = cookies.getCookiesString(hostname, directory);
		if (cookiesString.length) {
			options.headers.Cookie = cookiesString;
		}
		var req = http.request(options, function(res) {
			console.log('\n\nURL:' + url + '\nSTATUS: ' + res.statusCode);
			console.log('HEADERS: ' + JSON.stringify(res.headers));
			if (res.headers['set-cookie']) {
				cookies.parse(res.headers['set-cookie']);
			}
			if (!config.noRedirects && res.headers.location) {
				config.previousHost = hostname;
				config.previousDirectory = directory;
				return Request(res.headers.location, config);
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
}