var CookieManager = require('./classes/cookiemanager'),
	globalConfig = require('./config.json'),
	UserAgents = require('./classes/useragents'),
	Net = require('./classes/net');
	require('./classes/string');
	
var cookies = new CookieManager();
var userAgent = UserAgents[Math.floor(Math.random()*UserAgents.length)];

Net.Request({
	url:'http://pl'+globalConfig.world+'.plemiona.pl/login.php?user='+globalConfig.user+'&password='+globalConfig.password+'&utf-8',
	cookies: cookies,
});
