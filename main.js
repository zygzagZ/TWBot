var http = require('http');
var globalConfig = require('./config.json');
String.prototype.find = function(q,w) {
	var pos = this.indexOf(q,w);
	if (pos == -1) pos = Infinity;
	return pos;
}
String.prototype.findLast = function(q,w) {
	var pos = this.lastIndexOf(q,w);
	if (pos == -1) pos = Infinity;
	return pos;
}
String.prototype.startsWith = function(q) {
	if (this.length < q.length) return false;
	return this.substr(0, q.length) == q;
}
function CookieManager() {
	this.storage = {};
}
CookieManager.prototype.parse = function(t) {
	var now = new Date().getTime();
	for (var i = 0; i < t.length;i++) {
		var q = t[i].split(';'),
			main = q[0].match(/([^=]+)=(.*)/),
			name = main[1],
			value = main[2];
		
			 	 
		this.storage[name]={value: value};
			
		for (var x = 1; x < q.length; x++) {
			var cur = q[x].trim().match(/([^=]+)=*(.*)/),
				cname = cur[1].toLowerCase(),
				cval = cur[2];
			if (cname == 'path') {
				this.storage[name].path = cval;
			} else if (cname == 'expires') {
				var d = new Date(cval).getTime();
				if (d > now)
					this.storage[name].expires = d;
			} else if (cname == 'max-age') {
				this.storage[name].expires = now + parseInt(cval, 10)*1000;
			} else if (cname == 'domain') {
				this.storage[name].domain = cval;
			}
		}
	}
}

CookieManager.prototype.getCookiesString = function(host, path) {
	var now = new Date().getTime(), result = '';
	for (var i in this.storage) {
		if (this.storage[i].expires) {
			if (this.storage[i].expires < now) {
				delete this.storage[i];
				continue;
			}
		}
		if ( (!this.storage[i].path || this.storage[i].path == path) && (!this.storage[i].domain || host.indexOf(this.storage[i].domain) >= 0) ) {
			result += i + '=' + this.storage[i].value + '; ';
		}
	}	
	return result;
}
var cookies = new CookieManager();
/*
var postData = querystring.stringify({
	'msg' : 'Hello World!'
});
*/
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
			//'Content-Type': 'application/x-www-form-urlencoded',
			//'Content-Length': postData.length,
			//headers: {'Cookie': 'myCookie=myvalue'}
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
			console.log('BODY: ' + chunk);
		});
	});

	req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});

	// write data to request body
	// req.write(postData);
	req.end();
	
}
GET('http://pl'+globalConfig.world+'.plemiona.pl/login.php?user='+globalConfig.user+'&password='+globalConfig.password+'&utf-8', {
	//noRedirects: true
});
