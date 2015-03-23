var CookieManager = include('classes/cookiemanager'),
	UserAgents = include('classes/useragents'),
	RawRequest = include('classes/net'),
	
	hangoutsBot = require("hangouts-bot"),
	fs = require('fs'),
	parseString = require('xml2js').parseString,
	Village = include('classes/village');

include('classes/utility');

var interfaceData = {};

	
function Player(data) {
	var self = this;
	this.world = data.world;
	this.username = data.username;
	this.password = data.password;
	this.httppassword = data.httppass;
	this.cookies = new CookieManager();
	this.champions;
	this.userAgent = UserAgents.random();
	this.data = {villageList: {} }; // TODO: store valuable values from game_data here
	this.login(this.refreshVillagesList.bind(this));
	
	Object.defineProperty(this, 'util', {get: function() { return interfaceData[self.world]; }});
	
	if (!interfaceData[data.world]) {
		interfaceData[data.world] = true;
		if (fs.existsSync('./interface.' + data.world + '.json')) {
			fs.readFile('./interface.' + data.world + '.json', function(err, val) {
				interfaceData[data.world] = new Utility(JSON.parse(val));
			});
		} else {
			RawRequest({url: "http://pl"+data.world+".plemiona.pl/interface.php?func=get_building_info",
				callback: function(building_info) {
					parseString(building_info, function (err, result) {
						building_info = JSON.stringify(result.config).replace(/\[/g, '').replace(/\]/g, '');
						interfaceData[data.world] = new Utility(JSON.parse(building_info));
						fs.writeFile('./interface.'+data.world+'.json', building_info);
					});
				}
			});
		}
	}
	
	if (data.hangouts && data.hangouts.username && data.hangouts.password && data.hangouts.allow && data.hangouts.allow.length) {
		
		var bot = this.hangouts = new hangoutsBot(data.hangouts.username, data.hangouts.password);
		bot.allow = data.hangouts.allow;
		bot.context = {};
		
		bot.on('online', function() {
		    console.log(self.username + ': Hangouts online.');
		});

		bot.on('message', function(from, message) {
		    	console.log(from + ">> " + message);
			if (data.hangouts.allow.indexOf(from.split('/')[0]) < 0) {
				if (!data.hangouts.suppressWarning) {
					bot.sendMessage(from, 'Hello, ' + from + ', I am not allowed to communicate with you.');
				}
				return;
			}
			var msg = self.onHangoutsMessage(from, message);
			if (msg && msg.length) {
				bot.sendMessage(from, msg);
			}
		});
	}
}

Player.prototype = {
	login: function(success) {
		console.log('logging in');	
		this.request({
			url:'http://pl'+this.world+'.plemiona.pl/login.php?user='+this.username+'&password='+this.password+'&utf-8',
			cookies: this.cookies,
			callback: function(s) {console.log('login successful!'); success(s);}
		});
	},
	updateInfo: function(village_id) {
		console.log('updateInfo');
		this.request({
			url:'http://pl'+this.world+'.plemiona.pl/game.php?village='+village_id+'&screen=overview',
			cookies: this.cookies,
			callback: this.onVillageInfo.bind(this),
		});
	},
	onVillageInfo: function(str) {
		console.log('onVillageInfo');
		var id = this.parseInfo(str);
		if (id)
			setTimeout(Village.manage.bind(this.getVillage(id)), Math.random()*1000+1000);
	},
	parseInfo: function(str) {
		var data;
		var cs = str.indexOf('game_data = ')+12, ce = str.indexOf('};', cs)+1;
		data = JSON.parse(str.substr(cs, ce-cs));
		this.data.extend({
			player: data.player,
			csrf: data.csrf,
		});
		var villageProperties = {x:1,y:1,lastupdate: new Date().getTime(),name:1,storage_max:1,pop_max:1,wood:1,stone:1,iron:1,pop:1,trader_away:1,buildings:1,player_id:1};
		this.getVillage(data.village.id).extend(villageProperties.extend(true, data.village)); // copy only listed properties

		// TODO: parse and store event more overview data
		return data.village.id;
	},
	refreshVillagesList: function() { // fetch overview_villages
		console.log('refreshVillagesList');
		this.request({
			url:'http://pl'+this.world+'.plemiona.pl/game.php?screen=overview_villages',
			cookies: this.cookies,
			callback: this.onVillagesList.bind(this),
		});
	},
	onVillagesList: function(str) { // callback on overview_villages got
		console.log('onVillagesList');
		var startPos = str.indexOf('</tr>', str.indexOf('overview_table')+1)+5,
			finishPos = str.lastIndexOf('</tr>', str.indexOf('</table>', startPos)),
			tableString = str.substr(startPos, finishPos-startPos).split('</tr>');
			
		for (var i = 0; i < tableString.length; i++) {
			var s=tableString[i],cs=s.indexOf('data-id="')+9, ce = s.indexOf('"', cs+1), id = ~~s.substr(cs, ce-cs), d;

			cs = s.indexOf('data-text="', ce+1)+11; ce = s.indexOf('"', cs+1);
			var village_name = s.substr(cs, ce-cs);
			cs = s.lastIndexOf('(', s.indexOf('</span>', ce))+1; ce = s.indexOf(')', cs);
			var coordsSplit = s.substr(cs, ce-cs).split('|');
			var x = ~~coordsSplit[0], y = ~~coordsSplit[1];
			d=this.getVillage(id);
			this.data.villageList[id] = d;
			d.x=x;
			d.y=y;
			d.name = village_name;
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
			console.log('Scanned village:', d.id);
			// example: {"id":1337,"name":"My Very First Village","coordsText":"465|586","x":465,"y":586,"coords":[465,586],"points":1337,"res":[1000,1000,0],"storage":400000,"farm":{"used":239,"total":240,"free":1}}
		}
		
	},
	getVillage: function (id) {
		return Village(id, this);
	},
	request: function(config) { // request for page, basic checks for bot verification and session timeout
		var self = this;
		var callback = config.callback;
		if (!config.cookies) {
			config.cookies = this.cookies;
		}
		config.onRedirectTest = function(url) {
			if (url.indexOf('sid_wrong.php') > 0) {
				config.callback = callback;
				self.login(self.request.bind(self, config));
				return false;
			}
			return true;
		};
		config.callback = function(str, finalurl) {
			// TODO: check for bot verification
			// TODO: check for account ban
			// TODO: check for conservation works
			if (str.indexOf('&copy;') > 0) {
				console.log('wylogowano??', finalurl);
                                config.callback = callback;
                                self.login(self.request.bind(self, config));
				return;
			}
			try {
				self.parseInfo(str);
				callback(str);
			} catch(e) {
				console.log(e, e.stack);
				console.error("----------STRING", finalurl, "----------", str, '----------STRING END----------');
				return;
			}
		}
		if (config.delay) {
			setTimeout(function() {
				RawRequest(config);
			}, config.delay);
			delete config.delay;
		} else {
			RawRequest(config);
		}
	},
	onHangoutsMessage: function(from, message) {
		// TODO: parse hangouts commands and eventually respond
		var data = this.hangouts.context[from];
		if (!data) {
			data = this.hangouts.context[from] = {};
		}
		
		var cmd = message.match(/[a-z0-9]+/), t = message.split(" ");
		if (cmd) {
			cmd = cmd[0];
		} else {
			cmd = message;
		}
		if (!data.state) {
			if (cmd == 'status') {
				return "Runnin' hard! ;)";
			} else if (cmd == 'eco') {
				if (!data.village) {
					return "You have to select village first!";
				}
				var v = VillageId[data.village].buildings;
				if (!v) {
					return "?|?|?";
				}
				return [v.wood, v.stone, v.iron].join('|');
			} else if (cmd == 'village') {
				var v = VillageId[data.village];
				if (t[1] == 'list' || (!v && !t[1])) {
					var msg = "Villages list: ", n = 0;
					for (var i in this.data.villageList) {
						msg += '\n' + (++n) + ': ' + this.data.villageList[i].name;
					}
					return msg;
				} else if (!t[1] && v) {
					return "You are currently in " + v.name;
				} else {
					if (t[1] == parseInt(t[1], 10)) {
						var n = 0;
						for (var i in this.data.villageList) {
							if (++n == t[1]) {
								data.village = i;
								return "Village set: " + this.data.villageList[i].name;
							}
						}
						return "Village not found!";
					} else {
						// TODO: find villages by name;
					}
					// set village
				}
			} else if (cmd == 'echo') {
				return message;
			}
		} else {
			// TODO: find villages by name (conflict)
		}
	}
}
module.exports = Player;
