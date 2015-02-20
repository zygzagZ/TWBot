var http = require('http'),
	CookieManager = require('./classes/cookiemanager'),
	globalConfig = require('./config.json');
	require('./classes/string');
var cookies = new CookieManager();
function GET(url, config) {
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
	var pathDirectoryEnd = path.findLast('/', Math.min(path.find('?'), path.find('#'), path.length)), directory;
	directory=path.substr(0, pathDirectoryEnd+1);
	
	var options = {
		hostname: hostname,
		path: path,
		method: 'GET',
		headers: {
			'Accept': 'text/html,application/xhtml+xml,application/xml',
			'DNT': 1,
			'Cache-control':'no-cache',
			'Connection':'close',
			'Host': 'pl91.plemiona.pl',
			'Pragma': 'no-cache',
			'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.111 Safari/537.36',
		}
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
			return GET(res.headers.location, config);
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
GET('http://pl'+globalConfig.world+'.plemiona.pl/login.php?user='+globalConfig.user+'&password='+globalConfig.password+'&utf-8', {
	//noRedirects: true
});
