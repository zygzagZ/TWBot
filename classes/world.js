var RawRequest = include('classes/net'),
	CookieManager = include('classes/cookiemanager'),
	fs = require('fs'),
	parseString = require('xml2js').parseString,
	Village = include('classes/village');

var interfaceData = {};

function World(data) {
	var self = this;
	this.username = data.username;
	this.password = data.password;
	this.userAgent = data.userAgent;
	
	this.data = {villageList: {} }; // TODO: store valuable values from game_data here
	this.world = data.world;
	this.trace = '['+this.world + '/'+this.username+']';
	this.cookies = new CookieManager();
	this.champions;
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
	
	setTimeout(this.initTrophies.bind(this), rand(10000, 20000));
}

World.prototype = {
	login: function(success) {
		var self = this;
		console.log(this.trace,'logging in');	
		this.request({
			url:'http://pl'+this.world+'.plemiona.pl/login.php?user='+this.username+'&password='+this.password+'&utf-8',
			callback: function(s) {console.log(self.trace, 'login successful!'); success(s);}
		});
	},
	updateInfo: function(village_id) {
		this.request({
			url:'http://pl'+this.world+'.plemiona.pl/game.php?village='+village_id+'&screen=overview',
			callback: this.onVillageInfo.bind(this),
		});
	},
	onVillageInfo: function(str) {
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
	refreshVillagesList: function() {
		this.request({
			url:'http://pl'+this.world+'.plemiona.pl/game.php?screen=overview_villages',
			callback: this.onVillagesList.bind(this),
		});
	},
	onVillagesList: function(str) {
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
			console.log(this.trace, 'Scanned village:', d.id);
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
		if (!config.previousHost) {
			config.previousHost = 'pl'+this.world+'.plemiona.pl';
		}
		if (!config.previousDirectory) {
			config.previousDirectory = '/';
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
				console.log(self.trace,'logged out?', finalurl);
				config.callback = callback;
				self.login(self.request.bind(self, config));
				return;
			}
			try {
				self.parseInfo(str);
				callback(str);
			} catch(e) {
				console.log(self.trace, e, e.stack);
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
	onHangoutsMessage: function(from, message, data) {
		// TODO: parse hangouts commands and eventually respond
		
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
	},
	getVaildVillageId: function() {
		for (var i in this.villageList) {
			return i;
		}
		return 0;
	},
	initTrophies: function() {
		var self = this;
		var village_id = this.getVaildVillageId();
		var parseEvent;
		var ignoreplayers = ['698864250', '698386988', '8315787', '6825480'], lastplayerattacked = 0; // TODO: add storing this kind of data to config
		function scheduleEvent() {
			self.request({
				delay: 20*1000,
				url:'game.php?village='+village_id+'&screen=event_crest',
				callback: parseEvent
			});
		}
		parseEvent = function(str) {
			try {
				if (lastplayerattacked && str.indexOf('<div class="error_box">') > 0) {
					ignoreplayers.push(lastplayerattacked);
					console.log(self.trace, 'Ignoring player', lastplayerattacked);
					lastplayerattacked = 0;
				}
				var possible = str.match(/ost.pni.broni.cy[^0-9]+([0-9]+)/);
				var all = str.match(/Twoi czempioni:[^0-9]+([0-9]+)/);
				// href="/game.php?village=8239&action=challenge&h=6774&page=0&player_id=698808553&screen=event_crest";
				if (possible && possible[1])
					possible = ~~possible[1];
				else {console.log(self.trace, "blad bbb");scheduleEvent(); return;}
				if (all && all[1])
					all = ~~all[1];
				else {console.log(self.trace, "blad bbb2");scheduleEvent(); return;}
				if (all >= 8) {
					possible -= 3;
				}

				if (possible <= 0) {console.log(self.trace, 'No available champions!'); scheduleEvent();return;}


				var s = str.match(/href="(\/game.php\?village=[^"]+&amp;action=challenge&amp;h=[^"]+&amp;v=[^"]+&amp;page=[^"]+&amp;player_id=[^"]+&amp;screen=event_crest)/g);
				var url,ii=0;
				while(s && s.length > ii) {
					url = s[ii++].substr(6).replace(/&amp;/g, '&');
					var pid = url.match(/player_id=([0-9]+)/)[1];
					if (ignoreplayers.indexOf(pid)>=0) continue;
					console.log(self.trace, "Attacking player", url.match(/player_id=([0-9]+)/)[1]);
					lastplayerattacked = pid;
					self.request({
						delay: 1000+Math.random()*2000,
						url:url,
						callback: parseEvent
					});
					return true;
				} 
				lastplayerattacked = 0;
				if (true) {
					var page = str.match(/<strong> &gt;([0-9]+)&lt; <\/strong>/);
					if (page && page[1])
						page = ~~page[1];
					else {console.log(self.trace, 'blad cccc');scheduleEvent();return;}
					if (page > 14) {
						console.log(self.trace, 'All pages checked, no more trophies available!');
						scheduleEvent();
						return;
					}
					self.request({
						delay: 1000+Math.random()*2000,
						url:'game.php?village='+village_id+'&page='+(page)+'&screen=event_crest',
						callback: parseEvent
					});
				}
			} catch(e) {
				console.error(e);
				scheduleEvent();
			}
		}
		scheduleEvent();
	}
}
module.exports = World;
