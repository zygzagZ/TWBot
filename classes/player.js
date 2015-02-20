var CookieManager = require('./cookiemanager'),
	UserAgents = require('./useragents'),
	RawRequest = require('./net');

var VillageCoords = {}, VillageId = {};
	
function Player(data) {
	this.world = data.world;
	this.username = data.username;
	this.password = data.password;
	this.cookies = new CookieManager();
	this.userAgent = UserAgents[Math.floor(Math.random()*UserAgents.length)];
	this.data = {}; // TODO: store valuable values from game_data here
	this.login(this.refreshVillagesList.bind(this));
}

Player.prototype = {
	login: function(success) {
		console.log('login');
		this.request({
			url:'http://pl'+this.world+'.plemiona.pl/login.php?user='+this.username+'&password='+this.password+'&utf-8',
			cookies: this.cookies,
			callback: success
		});
	},
	manage: function(village_id) {
		if (VillageId[village_id].lastupdate < new Date().getTime()+10*60*1000) {
			this.updateInfo(village_id);
			return;
		}
		// TODO: managing village
	},
	updateInfo: function(village_id) {
		this.request({
			url:'http://pl'+this.world+'.plemiona.pl/game.php?village='+village_id+'&screen=overview',
			cookies: this.cookies,
			callback: this.onVillageInfo.bind(this),
		});
	},
	onVillageInfo: function(str) {
		var id = this.parseInfo(str);
		setTimeout(this.manage.bind(this, id), Math.random()*1000+1000);
	},
	parseInfo: function(str) {
		// TODO: parse overview data
		return id;
	},
	refreshVillagesList: function() { // fetch overview_villages
		this.request({
			url:'http://pl'+this.world+'.plemiona.pl/game.php?screen=overview_villages',
			cookies: this.cookies,
			callback: this.onVillagesList.bind(this),
		});
	},
	onVillagesList: function(str) { // callback on overview_villages got
		var startPos = str.indexOf('</tr>', str.indexOf('overview_table')+1)+5,
			finishPos = str.lastIndexOf('</tr>', str.indexOf('</table>', startPos)),
			tableString = str.substr(startPos, finishPos-startPos).split('</tr>');
			
		var managingTimeout = Math.random()*3000+5000;
		for (var i = 0; i < tableString.length; i++) {
			var s=tableString[i],cs=s.indexOf('data-id="')+9, ce = s.indexOf('"', cs+1), id = ~~s.substr(cs, ce-cs), d;
			if (!VillageId[id]) {
				d = {id: id, lastupdate: 0};
				setTimeout(this.manage.bind(this, id), managingTimeout);
				managingTimeout += Math.random()*3000+5000;
			} else {
				d = VillageId[id];
			}
			// scanning data from table
			cs = s.indexOf('data-text="', ce+1)+11; ce = s.indexOf('"', cs+1);
			d.name = s.substr(cs, ce-cs);
			cs = s.lastIndexOf('(', s.indexOf('</span>', ce))+1; ce = s.indexOf(')', cs);
			var coordsSplit = s.substr(cs, ce-cs).split('|');
			d.x = ~~coordsSplit[0];
			d.y = ~~coordsSplit[1];
			d.coords = [d.x, d.y];
			cs = s.indexOf('<td>', ce)+4; ce = s.indexOf('</td>', cs);
			d.points = ~~s.substr(cs, ce-cs);
			cs = s.indexOf('<td>', ce)+4; ce = s.indexOf('</td>', cs);
			var res = s.substr(cs, ce-cs).replace(/\<span class="grey"\>\.\<\/span\>/g, '').match(/\d+/g);
			d.res = [~~res[0], ~~res[1], ~~res[2]];
			cs = s.indexOf('<td>', ce)+4; ce = s.indexOf('</td>', cs);
			d.storage = ~~s.substr(cs, ce-cs);
			cs = s.indexOf('<td>', ce)+4; ce = s.indexOf('</td>', cs);
			var farmdata = s.substr(cs, ce-cs).split('/');
			d.farm={used:~~farmdata[0], total: ~~farmdata[1], free: farmdata[1]-farmdata[0]};
			VillageCoords[d.x*1000+d.y] = d;
			VillageId[d.id] = d;
			console.log('Scanned village: ' + JSON.stringify(d));
			// example: {"id":1337,"name":"XDNOWANAZWAXD","coordsText":"465|586","x":465,"y":586,"coords":[465,586],"points":1337,"res":[1000,1000,0],"storage":400000,"farm":{"used":239,"total":240,"free":1}}
		}
		
	},
	request: function(config) { // request for page, basic checks for bot verification and session timeout
		var self = this;
		config.onRedirectTest = function(url) {
			if (url.indexOf('sid_wrong.php') > 0) {
				self.login(self.request.bind(self, config));
				return false;
			}
			return true;
		};
		var callback = config.callback;
		config.callback = function(str) {
			// TODO: check for bot verification
			// TODO: check for account ban
			// TODO: check for conservation works
			// TODO: gather game_data info and store in this.data
			callback(str);
		}
		RawRequest(config);
	}
	
}
module.exports = Player;