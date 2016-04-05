var RawRequest = include('classes/net'),
	CookieManager = include('classes/cookiemanager'),
	loadConfig = include('classes/configmanager'),
	url = require('url'),

	parseString = require('xml2js').parseString,
	Village = include('classes/village'),
	Command = include('classes/command');

var worldConfig = {};

function World(data) {
	var self = this;
	this.userAgent = data.userAgent;
	this.player = data.player;

	this.data = {villageList: new Village.List(), settings: data}; // TODO: store values from game_data here

	this.world = data.world;
	
	
	this.trace = '['+this.world + '/'+data.username+']';
	this.cookies = new CookieManager();
	// We first need to load villages, only then we can load config
	this.login(this.refreshVillagesList.bind(this, this.loadConfig.bind(this)));
	
	Object.defineProperty(this, 'util', {get: function() { return worldConfig[self.world] && worldConfig[self.world].util; }});
	Object.defineProperty(this, 'worldConfig', {get: function() { return worldConfig[self.world]; }});
	
	if (!worldConfig[self.world]) {
		worldConfig[self.world] = true;
		loadConfig('w' + self.world, function(conf) {
			worldConfig[self.world] = conf;
			if (!conf.util) {
				RawRequest({url: 'http://pl'+self.world+'.plemiona.pl/interface.php?func=get_building_info',
					callback: function(building_info) {
						parseString(building_info, function (err, result) {
							building_info = JSON.stringify(result.config).replace(/\[/g, '').replace(/\]/g, '');
							conf.util = new Utility(JSON.parse(building_info));
						});
					}
				});
			} else {
				conf.util = new Utility(conf.util.data);
			}
		});
	}
}

World.prototype = {
	loadConfig: function() {
		var self = this;
		loadConfig('p' + this.data.settings.username + '.w' + this.world, function(conf) {
			self.config = conf;
			if (!conf.commandList) {
				conf.commandList = [];
			}
			if (self.data.trophies) {
				setTimeout(self.initTrophies.bind(this), rand(10000, 20000));
			}
			self.sendCommand();
			setInterval(self.sendCommand.bind(self), 24*60*60000);
		}, {player: self});
	},
	login: function(success) {
		var self = this;
		console.log(this.trace,'logging in');	
		this.request({
			url:'http://pl'+this.world+'.plemiona.pl/login.php?user='+this.player.username+'&password='+this.player.password+'&utf-8',
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
		if (id) {
			setTimeout(Village.manage.bind(this.getVillage(id)), Math.random()*1000+1000);
		}
	},
	onNewGameData: function(data) {
		this.data.extend({
			player: data.player,
			csrf: data.csrf,
		});
		var villageProperties = {x:1,y:1,lastupdate: new Date().getTime(),name:1,storage_max:1,pop_max:1,wood:1,stone:1,iron:1,pop:1,trader_away:1,buildings:1,player_id:1};
		this.getVillage(data.village.id).extend(villageProperties.extend(true, data.village)); // copy only listed properties
	},
	parseInfo: function(str) {
		var cs = str.indexOf('game_data = ')+12, ce = str.indexOf('};', cs)+1;
		var data = JSON.parse(str.substr(cs, ce-cs));
		this.onNewGameData(data);
		
		// TODO: parse and store even more overview data
		return data.village.id;
	},
	refreshVillagesList: function(cb, err) {
		this.request({
			url:'http://pl'+this.world+'.plemiona.pl/game.php?screen=overview_villages&mode=prod&group=0&page=-1', 
			callback: this.onVillagesList.bind(this, cb),
			error: err
		});
	},
	onVillagesList: function(cb, str) {
		str = str.replace(/<span class="grey"\>\.<\/span\>/g, '');
		var startPos = str.indexOf('</tr>', str.indexOf('overview_table')+1)+5,
			finishPos = str.lastIndexOf('</tr>', str.indexOf('</table>', startPos)),
			tableString = str.substr(startPos, finishPos-startPos).split('</tr>');
			
		for (var i = 0; i < tableString.length; i++) {
			var s=tableString[i],cs=s.indexOf('data-id="')+9, ce = s.indexOf('"', cs+1), id = parseInt(s.substr(cs, ce-cs), 10), d;

			cs = s.indexOf('data-text="', ce+1)+11; ce = s.indexOf('"', cs+1);
			var village_name = s.substr(cs, ce-cs);
			cs = s.lastIndexOf('(', s.indexOf('</span>', ce))+1; ce = s.indexOf(')', cs);
			var coordsSplit = s.substr(cs, ce-cs).split('|');
			var x = parseInt(coordsSplit[0], 10), y = parseInt(coordsSplit[1], 10);
			d=this.getVillage(id);
			this.data.villageList.insert(d);
			d.x=x;
			d.y=y;
			d.name = village_name;
			d.coords = [d.x, d.y];
			cs = s.indexOf('<td>', ce)+4; ce = s.indexOf('</td>', cs);
			d.points = parseInt(s.substr(cs, ce-cs), 10);
			cs = s.indexOf('<td>', ce)+4; ce = s.indexOf('</td>', cs);
			var res = s.substr(cs, ce-cs).match(/\d+/g);
			d.res = [parseInt(res[0], 10), parseInt(res[1], 10), parseInt(res[2], 10)];
			cs = s.indexOf('<td>', ce)+4; ce = s.indexOf('</td>', cs);
			d.storage = parseInt(s.substr(cs, ce-cs), 10);
			cs = s.indexOf('<td>', ce)+4; ce = s.indexOf('</td>', cs);
			var farmdata = s.substr(cs, ce-cs);
			if (farmdata[1] === 'a') { // Player has premium
				cs = s.indexOf('<td>', ce)+4; ce = s.indexOf('</td>', cs);
				farmdata = s.substr(cs, ce-cs);
			}
			farmdata = farmdata.split('/');
			d.farm={used:parseInt(farmdata[0], 10), total: parseInt(farmdata[1], 10), free: farmdata[1]-farmdata[0]};
			console.log(this.trace, 'Scanned village:', d.id);
			// example: {"id":1337,"name":"My Very First Village","coordsText":"465|586","x":465,"y":586,"coords":[465,586],"points":1337,"res":[1000,1000,0],"storage":400000,"farm":{"used":239,"total":240,"free":1}}
		}
		if (cb) { cb(); }
	},
	getVillage: function (id) {
		return new Village(id, this);
	},
	get: function(screen, params, callback, errorCallback) {
		params.screen = screen;
		this.request({
			url: url.format({
				protocol: 'https',
				host: 'pl'+this.world+'.plemiona.pl',
				pathname: '/game.php',
				query: params
			}),
			callback: callback,
			errorCallback: errorCallback,
			json: true
		});
	},
	post: function(screen, params, data, callback, errorCallback, agent) {
		params.screen = screen;
		params.h = this.data.csrf;
		this.request({
			url: url.format({
				protocol: 'https',
				host: 'pl'+this.world+'.plemiona.pl',
				pathname: '/game.php',
				query: params
			}),
			callback: callback,
			errorCallback: errorCallback,
			json: true,
			data: data,
			agent: agent
		});
	},
	request: function(config) { // request for page, basic checks for bot verification and session timeout
		var self = this,
			callback = config.callback;
		
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
			if (str.toLowerCase().indexOf('ochrona botowa') > 0) {
				console.log(self.trace, 'ANTI-BOT');
				self.notify('Anti-Bot check.');
				if (typeof config.error === 'function') {
					config.error(1);
				}
				return;
			}
			if (str.indexOf('&copy;') > 0) {
				console.log(self.trace,'logged out?', finalurl);
				config.callback = callback;
				self.login(self.request.bind(self, config));
				return;
			}
			try {
				if (config.json) {
					try {
						str = JSON.parse(str);
					} catch(e) {}
					if (str.game_data) {
						self.onNewGameData(str.game_data);
					}
					var arg = str;
					if (str.content) {
						arg = str.content;
					} else if (str.response && str.response !== 'partial_reload') {
						arg = str.response;
					}

					if (str.error && config.errorCallback) {
						config.errorCallback(str.error, str);
					} else {
						callback(arg, str);
					}
				} else {
					callback(str);
					self.parseInfo(str);
				}
			} catch(e) {
				console.log(self.trace, e, e.stack);
				console.error('----------STRING', finalurl, '----------', str, '----------STRING END----------');
				return;
			}
		};
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
		var cmd = message.match(/[a-z0-9]+/), t = message.split(' ');
		if (cmd) {
			cmd = cmd[0];
		} else {
			cmd = message;
		}
		if (!data.village && this.data.villageList.length === 1) {
			for (var firstVill in this.data.villageList) {
				data.village = this.data.villageList[firstVill];
				this.notify('Automatically selecting village ' + data.village.name);
				break;
			}
		}
		if (!data.state) {
			if (cmd === 'status') {
				return 'Runnin\' hard! ;)';
			} else if (cmd === 'eco') {
				if (!data.village) {
					return 'You have to select village first!';
				}
				var vb = data.village.buildings;
				if (!vb) {
					return '?|?|?';
				}
				return [vb.wood, vb.stone, vb.iron].join('|');
			} else if (cmd === 'village') {
				var v = data.village, curNum = 1;
				if (t[1] === 'list' || (!v && !t[1])) {
					var msg = 'villages list: ';
					for (var i in this.data.villageList) {
						msg += '\n' + (curNum++) + ': ' + this.data.villageList[i].name;
					}
					return msg;
				} else if (!t[1] && v) {
					return 'You are currently in ' + v.name;
				} else {
					var searchString = t[1], villNum = parseInt(searchString, 10), villId;
					if (searchString === villNum.toString()) {
						for (villId in this.data.villageList) {
							if (curNum++ === villNum) {
								data.village = this.data.villageList[villId];
								return 'Village set: ' + data.village.name;
							}
						}
						return 'Village not found!';
					} else {
						var minDist = Infinity, minDistData = [];
						for (villId in this.data.villageList) {
							var curDist = searchString.distance(this.data.villageList[villId].name);
							if (curDist < minDist) {
								minDist = curDist;
								minDistData = [this.data.villageList[villId]];
							} else if (curDist === minDist) {
								minDistData.push(this.data.villageList[villId]);
							}
						}
						if (minDistData.length < 1) {
							return 'You have 0 villages.';
						} else if (minDistData.length > 1) {
							// got to choose
							var ret = 'Multiple villages matching:';
							for (var id = 0; id < minDistData.length; id++) {
								ret += '\n' + (id+1) + ': ' +  minDistData[id].name;
							}
							data.state = {type:'village_name', data:minDistData};
							return ret + '\nChoose number.';
						} else {
							data.village = minDistData[0];
							return 'Village set: ' + data.village.name;
						}
					}
				}
			} else if (cmd === 'echo') {
				return message;
			}
		} else if (data.state.type === 'village_name') {
			var villageChosen = parseInt(t[1], 10);
			if (villageChosen < 1 || villageChosen > data.state.list.length) {
				return 'Enter number in range 1-' + data.state.list.length;
			}
			data.village = data.state.list[villageChosen - 1];
			delete data.state;
			return 'Village set: ' + data.village.name;
		} else {
			return 'Unknown data.state: ' + data.state.type;
		}
	},
	notify: function(what) {
		return this.player.notify('[' + this.world + '] ' + what);
	},
	addCommand: function(att) { 
		// it takes troops array, time of arrival (or null), target, source and type (attack/support)
		// returns id of attack or 0 in case it can't be sent
		return new Command(att, this);
	},
	sendCommand: function(att) { 
		// need to check here if next command is in <10 seconds, and if so then create sendCommand timeout
		var maxTime = Date.now() + 10*1000;
		if (att) {
			att.source.sendAttack(att.target, att.troops, function() {
				console.log('Successfully sent!');
			}, function(err) {
				console.log('Not sent! Error: ', err);
			}, att.sendTime, att.support); // target, troops, onSuccess, onError, sendTime

			this.config.commandList.splice(this.config.commandList.indexOf(att), 1);	
		}
		for (var i = 0; i < this.config.commandList.length; i++) {
			var a = this.config.commandList[i];
			if (!a.timeout && (a.sendTime < maxTime || (i === 0 && a.sendTime < Date.now()+25*60*60000))) { //can schedule it now...
				a.timeout = setTimeout(this.sendCommand.bind(this), a.sendTime-2000 - Date.now(), a); // timeout of sendCommand
			}
		}
	},
	getValidVillageId: function() {
		for (var i in this.villageList) {
			return i;
		}
		return 0;
	},
	initTrophies: function() {
		var self = this;
		var village_id = this.getValidVillageId();
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
				if (possible && possible[1]) {
					possible = parseInt(possible[1], 10);
				}
				else { scheduleEvent(); return; }
				if (all && all[1]) {
					all = parseInt(all[1], 10);
				}
				else { scheduleEvent(); return; }
				if (all >= 8) {
					possible -= 3;
				}

				if (possible <= 0) {console.log(self.trace, 'No available champions!'); scheduleEvent();return;}


				var s = str.match(/href="(\/game.php\?village=[^"]+&amp;action=challenge&amp;h=[^"]+&amp;v=[^"]+&amp;page=[^"]+&amp;player_id=[^"]+&amp;screen=event_crest)/g);
				var url,ii=0;
				while(s && s.length > ii) {
					url = s[ii++].substr(6).replace(/&amp;/g, '&');
					var pid = url.match(/player_id=([0-9]+)/)[1];
					if (ignoreplayers.indexOf(pid)>=0) {
						continue;
					}
					console.log(self.trace, 'Attacking player', url.match(/player_id=([0-9]+)/)[1]);
					lastplayerattacked = pid;
					self.request({
						delay: 1000+Math.random()*2000,
						url:url,
						callback: parseEvent
					});
					return true;
				} 
				lastplayerattacked = 0;
				var page = str.match(/<strong> &gt;([0-9]+)&lt; <\/strong>/);
				if (page && page[1]) {
					page = parseInt(page[1], 10);
				}
				else { scheduleEvent(); return; }
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
			} catch(e) {
				console.error(e);
				scheduleEvent();
			}
		};
		scheduleEvent();
	}
};
module.exports = World;
