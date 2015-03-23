var CookieManager = include('classes/cookiemanager'),
	UserAgents = include('classes/useragents'),
	RawRequest = include('classes/net'),
	
	hangoutsBot = require("hangouts-bot"),
	fs = require('fs'),
	parseString = require('xml2js').parseString;

include('classes/utility');

var VillageCoords = {}, VillageId = {}, lastVillageAddedTime = 0, interfaceData = {};

	
function Player(data) {
	// console.log('config: ', JSON.stringify(data));
	var self = this;
	this.world = data.world;
	this.username = data.username;
	this.password = data.password;
	this.httppassword = data.httppass;
	this.cookies = new CookieManager();
	this.userAgent = UserAgents[Math.floor(Math.random()*UserAgents.length)];
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
	manage: function(village_id) {
		console.log('manage');
		/*if (VillageId[village_id].lastupdate < new Date().getTime()+10*60*1000) {
			this.updateInfo(village_id);
			return;
		}*/
		// TODO: managing village
		// TODO: refactor building queue
		// TODO: instead of checking every 30 mins remember when to check (when needs for next building in queue are met)
		var self = this;		
		var v = self.getVillage(0,0,village_id);
		//if (false) // temporarily disable building
		function building() {
			self.request({
				url:'http://pl'+self.world+'.plemiona.pl/game.php?village='+village_id+'&screen=main',
				cookies: self.cookies,
				callback: function(str) {
					var order_count = 0;
					if (str.indexOf('BuildingMain.order_count') > 0)
						order_count = ~~str.match(/BuildingMain.order_count = (\d+)/)[1];
					var cs = str.indexOf('BuildingMain.buildings = ')+24, ce = str.indexOf('</script>', cs);
					var BuildingsData = JSON.parse(str.substr(cs, ce-cs-2).replace(/&amp;/g, '&'));
					var eco = [BuildingsData.wood.level_next-1, BuildingsData.stone.level_next-1, BuildingsData.iron.level_next-1];
					eco = [['wood', 'stone', 'iron'][eco.indexOf(Math.min.apply(Math, eco))], Math.min.apply(Math, eco)];
					var buildingOrder = 'iron|stone|wood|place|stone,2|wood,2|iron,2|stone,3|stone,4|wood,3|wood,4|wood,5|wood,6|stone,5|main,2|storage,3|wood,8|stone,6|iron,6|main,3|wood,9|stone,8|barracks|wood,11|stone,11|iron,10|wood,12|stone,12|eco,15|main,4|main,5|storage,3|wood,16|stone,16|wood,17|stone,17|wood,18|stone,18|iron,16|stone,19|wood,19|stone,20|wood,20|stone,21|wood,21|iron,17|stone,22|wood,22|stone,23|wood,23|iron,20|stone,25|wood,25|main,10|wall,5|main,15|wall,10|barracks,5|smith,5|barracks,10|smith,10|stable,3|smith,2|farm,2|market|barracks,2|barracks,3|smith,3|main,6|barracks,4|storage,4|main,8|farm,4|smith,4|smith,5|barracks,5|storage,5|storage,6|market,2|market,3|main,9|main,10|stable|stable,2|stable,3|wall|storage,10|farm,10|statue|eco,13|main,13|eco,19|main,17|storage,17|main,20|garage,5|storage,20|eco,25|stable,5|market,10|smith,15|barracks,15|wall,15|smith,20|snob|eco,26|eco,27|eco,28|eco,29|eco,30|storage,30|farm,30|barracks,10|stable,8|garage,3|barracks,15|stable,10|market,20|barracks,20|stable,17|garage,10|barracks,25|stable,20|hide,10'.split('|');
					function checkLevel(s) {
						return BuildingsData[s] ? BuildingsData[s].level_next-1 : 0;
					}
					function whatToBuild() {
						var building = '';
						for (var i = 0; i < buildingOrder.length; i++) {
							var d = buildingOrder[i].split(','), lvl;
							if (d.length<2) d[1] = 1;
							if (d[0] == 'eco') {
								if (eco[1] < parseInt(d[1], 10)) {
									building = eco[0];
									break;
								}
							} else if (checkLevel(d[0]) < parseInt(d[1], 10)) {
								building = d[0];
								break;
							}
						}
						if (building == '') {
							return;
						}
						while (building.length) {
							var d = BuildingsData[building]
								, err = d.error || ''
								, needFarm = err.indexOf(BuildingsData.farm.name) >= 0// need to build farm first
								, needStorage = err.indexOf(BuildingsData.storage.name) >= 0 // need to build storage first
								;

							console.log('wannabuild: ', building, 'err: ', err, 'needFarm: ', needFarm, 'needStorage: ', needStorage);

							if (needFarm) {
								building = 'farm';
								continue;
							} else if (needStorage) {
								building = 'storage';
								continue;
							}

							if (
								(d.next_level > d.max_level) 
								// TODO: add more checks
							) {
								building = ''; break;
							}
							// TODO: work out eventual bug - TW doesn't send all buildings, just these you can build
							// TODO: add managing buildings using info from interface.php
							break;
						}
						return building;
					}
					var id = whatToBuild();
					if (BuildingsData[id] && BuildingsData[id].can_build && order_count < 2 && !BuildingsData[id].error) {
						console.log("BUILDING: " + id);
						self.request({
							url:'http://pl'+self.world+'.plemiona.pl' + BuildingsData[id].build_link,
							cookies: self.cookies,
							callback: function(str) {
								var buildtime = BuildingsData[id].build_time * 1000;
								if (order_count < 2-1)
									buildtime = Math.min(buildtime, Math.random()*5000+3000);
								
	//							setTimeout(self.manage.bind(self, village_id), buildtime);
								setTimeout(building, buildtime);
								console.log('set new build timeout in ' + buildtime/1000 + ' seconds.');
							}
						});
						
					} else { // check again in 30 minutes
	//					setTimeout(self.manage.bind(self, village_id), 30*60*1000);
						setTimeout(building, 30*60*1000);
						console.log('set new check timeout in ' + 30*60 + ' seconds.');
					}
				}
			});
		}
		building();
		var parseEvent;
		var ignoreplayers = ['698864250', '698386988', '8315787', '9321438'], lastplayerattacked = 0;
		function scheduleEvent() {
			self.request({
				delay: 20*1000,
				url:'http://pl'+self.world+'.plemiona.pl/game.php?village='+village_id+'&screen=event_crest',
				cookies: self.cookies,
				callback: parseEvent
			});
		}
		parseEvent = function(str) {
			try {
				if (lastplayerattacked && str.indexOf('<div class="error_box">') > 0) {
					ignoreplayers.push(lastplayerattacked);
					console.log('Ignoring player', lastplayerattacked);
					lastplayerattacked = 0;
				}
				var possible = str.match(/ost.pni.broni.cy[^0-9]+([0-9]+)/);
				var all = str.match(/Twoi czempioni:[^0-9]+([0-9]+)/);
				// href="/game.php?village=8239&action=challenge&h=6774&page=0&player_id=698808553&screen=event_crest";
				if (possible && possible[1])
					possible = ~~possible[1];
				else {console.log("blad bbb");scheduleEvent(); return;}
				if (all && all[1])
					all = ~~all[1];
				else {console.log("blad bbb2");scheduleEvent(); return;}
				console.log('all: ', all, 'possible:', possible);
				if (all >= 8) {
					possible -= 3;
				}

				if (possible <= 0) {console.log('no champions available!'); scheduleEvent();return;}


				var s = str.match(/href="(\/game.php\?village=[^"]+&amp;action=challenge&amp;h=[^"]+&amp;v=[^"]+&amp;page=[^"]+&amp;player_id=[^"]+&amp;screen=event_crest)/g);
				console.log('s: ', s);
				var url,ii=0;
				while(s && s.length > ii) {
					url = s[ii++].substr(6).replace(/&amp;/g, '&');
					var pid = url.match(/player_id=([0-9]+)/)[1];
					if (ignoreplayers.indexOf(pid)>=0) continue;
					console.log("GONNA ATTACK, URL: ", url);
					lastplayerattacked = pid;
					self.request({
						delay: 1000+Math.random()*2000,
						url:'http://pl'+self.world+'.plemiona.pl'+url,
						cookies: self.cookies,
						callback: parseEvent
					});
					return true;
				} 
				lastplayerattacked = 0;
				if (true) {
					var page = str.match(/<strong> &gt;([0-9]+)&lt; <\/strong>/);
					if (page && page[1])
						page = ~~page[1];
					else {console.log('blad cccc');scheduleEvent();return;}
					if (page > 14) {
						console.log('wszystkie strony sprawdzone, za malo godel! XD');
						scheduleEvent();
						return;
					}
					console.log('pagenow: ', page);
					self.request({
						delay: 1000+Math.random()*2000,
						url:'http://pl'+self.world+'.plemiona.pl/game.php?village='+village_id+'&page='+(page)+'&screen=event_crest',
						cookies: self.cookies,
						callback: parseEvent
					});
				}
			} catch(e) {
				console.error(e);
				scheduleEvent();
			}
		}
		scheduleEvent();
		//setTimeout(self.manage.bind(self, village_id), Math.random()*8*60*1000 + 7*60*1000);
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
			setTimeout(this.manage.bind(this, id), Math.random()*1000+1000);
	},
	parseInfo: function(str) {
		var data;
		console.log('parseInfo');
		var cs = str.indexOf('game_data = ')+12, ce = str.indexOf('};', cs)+1;
		data = JSON.parse(str.substr(cs, ce-cs));
		this.data.extend({
			player: data.player,
			csrf: data.csrf,
		});
		var villageProperties = {lastupdate: new Date().getTime(),name:1,storage_max:1,pop_max:1,wood:1,stone:1,iron:1,pop:1,trader_away:1,buildings:1,player_id:1};
		this.getVillage(data.village.x, data.village.y, data.village.id).extend(villageProperties.extend(true, data.village)); // copy only listed properties

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
			d=this.getVillage(x,y,id);
			this.data.villageList[id] = d;

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
			console.log('Scanned village: ' + JSON.stringify(d));
			// example: {"id":1337,"name":"My Very First Village","coordsText":"465|586","x":465,"y":586,"coords":[465,586],"points":1337,"res":[1000,1000,0],"storage":400000,"farm":{"used":239,"total":240,"free":1}}
		}
		
	},
	getVillage: function (x, y, id) {
		var v = VillageId[id];
		if (!v && x && y) {
			v = {id: ~~id, lastupdate: 0, x:~~x, y:~~y};
			VillageCoords[x*1000+y] = v;
			VillageId[id] = v;

			var now=new Date().getTime();
			lastVillageAddedTime = Math.max(lastVillageAddedTime, now) + Math.random()*3000+5000; // schedule village managing
			
			setTimeout(this.manage.bind(this, id), lastVillageAddedTime-now);
		}
		return v;
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
				console.error(e, "----------STRING", finalurl, "----------", str, '----------STRING END----------');
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
