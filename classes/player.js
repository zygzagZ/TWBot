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
		this.request({
			url:'http://pl'+this.world+'.plemiona.pl/game.php?village='+village_id+'&screen=main',
			cookies: this.cookies,
			callback: function(str) {
				var order_count = 0;
				if (str.indexOf('BuildingMain.order_count') > 0)
					order_count = ~~str.match(/BuildingMain.order_count = (\d+)/)[1];
				var cs = str.indexOf('BuildingMain.buildings = ')+24, ce = str.indexOf('</script>', cs);
				var BuildingsData = JSON.parse(str.substr(cs, ce-cs-2).replace(/&amp;/g, '&'));
				var eco = [BuildingsData.wood.level_next-1, BuildingsData.stone.level_next-1, BuildingsData.iron.level_next-1];
				eco = [['wood', 'stone', 'iron'][eco.indexOf(Math.min.apply(Math, eco))], Math.min.apply(Math, eco)];
				var buildingOrder = 'iron|stone|wood|place|stone,2|wood,2|iron,2|stone,3|stone,4|wood,3|wood,4|wood,5|wood,6|stone,5|main,2|storage,3|wood,8|stone,6|iron,6|main,3|wood,9|stone,8|barracks|wood,11|stone,11|iron,10|wood,12|stone,12|eco,15|main,4|main,5|storage,3|smith|smith,2|farm,2|market|barracks,2|barracks,3|smith,3|main,6|barracks,4|storage,4|main,8|farm,4|smith,4|smith,5|barracks,5|storage,5|storage,6|market,2|market,3|main,9|main,10|stable|stable,2|stable,3|wall|storage,10|farm,10|statue|eco,13|main,13|eco,19|main,17|storage,17|main,20|storage,20|farm,20|eco,25|storage,25|eco,30|wall,20|smith,20|market,10|snob|storage,30|farm,30|barracks,10|stable,8|garage,3|barracks,15|stable,10|market,20|barracks,20|stable,17|garage,10|barracks,25|stable,20|hide,10'.split('|');
				function checkLevel(s) {
					return BuildingsData[s] ? BuildingsData[s].level_next-1 : 0;
				}
				function whatToBuild() {
					for (var i = 0; i < buildingOrder.length; i++) {
						var d = buildingOrder[i].split(','), lvl;
						if (d.length<2) d[1] = 1;
						if (d[0] == 'eco') {
							if (eco[1] < parseInt(d[1], 10))
								return eco[0];
						} else if (checkLevel(d[0]) < parseInt(d[1], 10))
							return d[0];
					}
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
							
							setTimeout(self.manage.bind(self, village_id), buildtime);
							console.log('set new build timeout in ' + buildtime/1000 + ' seconds.');
						}
					});
					
				} else { // check again in 30 minutes
					setTimeout(self.manage.bind(self, village_id), 30*60*1000);
					console.log('set new check timeout in ' + 30*60 + ' seconds.');
				}
			}
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
		setTimeout(this.manage.bind(this, id), Math.random()*1000+1000);
	},
	parseInfo: function(str) {
		console.log('parseInfo');
		// TODO: parse overview data
		return id;
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
			// example: {"id":1337,"name":"My Very First Village","coordsText":"465|586","x":465,"y":586,"coords":[465,586],"points":1337,"res":[1000,1000,0],"storage":400000,"farm":{"used":239,"total":240,"free":1}}
		}
		
	},
	request: function(config) { // request for page, basic checks for bot verification and session timeout
		var self = this;
		var callback = config.callback;
		config.onRedirectTest = function(url) {
			if (url.indexOf('sid_wrong.php') > 0) {
				config.callback = callback;
				self.login(self.request.bind(self, config));
				return false;
			}
			return true;
		};
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