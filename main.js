var http = require('http'),
	CookieManager = require('./classes/cookiemanager'),
	globalConfig = require('./config.json'),
	UserAgents = require('./classes/useragents');
	require('./classes/net');
	require('./classes/string');
var cookies = new CookieManager();
var userAgent = UserAgents[Math.floor(Math.random()*UserAgents.length)];

Net.get('http://pl'+globalConfig.world+'.plemiona.pl/login.php?user='+globalConfig.user+'&password='+globalConfig.password+'&utf-8', {
	//noRedirects: true
});
