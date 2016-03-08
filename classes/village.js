var Villages = {};
var KeepAliveAgent = include('classes/keep-alive-agent');
var units = ['spear', 'sword', 'axe', 'archer', 'spy', 'light', 'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob'];

function Village(id, player) {
	this.id = parseInt(id, 10);
	this.lastupdate = 0;
	
	var now=new Date().getTime();
	player.villageManageTimeout = Math.max(player.villageManageTimeout || 0, now) + Math.random()*3000+5000; // schedule village managing
		
	setTimeout(this.manage.bind(this, id), player.villageManageTimeout-now);

	Object.defineProperty(this, 'player', {
		enumerable: false,
		value: player
	});
}

Village.prototype = {
	getBuildingsData: function() {
		// TODO: refactor building queue
		// TODO: instead of checking every 30 mins remember when to check (when needs for next building in queue are met)
		var v = this;	
		var village_id = v.id;
		this.player.request({
			url:'http://pl'+this.player.world+'.plemiona.pl/game.php?village='+village_id+'&screen=main',
			callback: function(str) {
				var order_count = 0;
				if (str.indexOf('BuildingMain.order_count') > 0) {
					order_count = parseInt(str.match(/BuildingMain.order_count = (\d+)/)[1], 10);
					if (order_count >= 2) {
						setTimeout(v.getBuildingsData.bind(v), 30*60*1000);
						console.log('Already 2+ orders. Set new check timeout in ' + 30*60 + ' seconds.');
						return;
					}
				}
				var cs = str.indexOf('BuildingMain.buildings = ')+24, ce = str.indexOf('};', cs)+1;
				v.parseBuildingsData(JSON.parse(str.substr(cs, ce-cs).replace(/&amp;/g, '&')), order_count);
			}
		});
	},
	getNextItemInBuildingQueue: function(queue, data) {
		var eco = [data.wood.level_next-1, data.stone.level_next-1, data.iron.level_next-1];
		eco = [['wood', 'stone', 'iron'][eco.indexOf(Math.min.apply(Math, eco))], Math.min.apply(Math, eco)];
		for (var i = 0; i < queue.length; i++) {
			var d = queue[i].split(',');
			if (d.length<2) {
				d[1] = 1;
			}
			if (d[0] === 'eco') {
				if (eco[1] < parseInt(d[1], 10)) {
					return eco[0];
				}
			} else if ((data[d[0]] ? data[d[0]].level_next-1 : 0) < parseInt(d[1], 10)) {
				return d[0];
			}
		}
		return false;
	},
	parseBuildingsData: function(BuildingsData, order_count) {
		var buildingOrder = 'iron|stone|wood|place|stone,2|wood,2|iron,2|stone,3|stone,4|wood,3|wood,4|wood,5|wood,6|stone,5|main,2|storage,3|wood,8|stone,6|iron,6|main,3|wood,9|stone,8|barracks|wood,11|stone,11|iron,10|wood,12|stone,12|eco,15|main,4|main,5|storage,3|wood,16|stone,16|wood,17|stone,17|wood,18|stone,18|iron,16|stone,19|wood,19|stone,20|wood,20|stone,21|wood,21|iron,17|stone,22|wood,22|stone,23|wood,23|iron,20|stone,25|wood,25|main,10|wall,5|main,15|wall,10|barracks,5|smith,5|barracks,10|smith,10|stable,3|smith,2|farm,2|market|barracks,2|barracks,3|smith,3|main,6|barracks,4|storage,4|main,8|farm,4|smith,4|smith,5|barracks,5|storage,5|storage,6|market,2|market,3|main,9|main,10|stable|stable,2|stable,3|wall|storage,10|farm,10|statue|eco,13|main,13|eco,19|main,17|storage,17|main,20|garage,5|storage,20|eco,25|stable,5|market,10|smith,15|barracks,15|wall,15|smith,20|snob|eco,26|eco,27|eco,28|eco,29|eco,30|storage,30|farm,30|barracks,10|stable,8|garage,3|barracks,15|stable,10|market,20|barracks,20|stable,17|garage,10|barracks,25|stable,20|hide,10'.split('|'),
			building = this.getNextItemInBuildingQueue(buildingOrder, BuildingsData),
			v = this, d;
		while (building) {
			d = BuildingsData[building];
			var err = d.error || '',
				needFarm = err.indexOf(BuildingsData.farm.name) >= 0, // need to build farm first
				needStorage = err.indexOf(BuildingsData.storage.name) >= 0; // need to build storage first
				

			// console.log('wannabuild: ', building, 'err: ', err, 'needFarm: ', needFarm, 'needStorage: ', needStorage);

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
				building = false; break;
			}
			// TODO: work out eventual bug - TW doesn't send all buildings, just these you can build
			// TODO: add managing buildings using info from interface.php
			break;
		}
		if (BuildingsData[building] && BuildingsData[building].can_build && !BuildingsData[building].error) {
			// console.log('BUILDING: ' + building);
			this.player.request({
				url: BuildingsData[building].build_link,
				callback: function() {
					var buildtime = BuildingsData[building].build_time * 1000;
					if (order_count < 1) {
						buildtime = Math.min(buildtime, Math.random()*5000+3000);
					}
					
					setTimeout(v.getBuildingsData.bind(v), buildtime);
					console.log('set new build timeout in ' + buildtime/1000 + ' seconds.');
				}
			});
			
		} else { // check again in 30 minutes
			setTimeout(v.getBuildingsData.bind(v), 30*60*1000);
			console.log('set new check timeout in ' + 30*60 + ' seconds.');
		}
	},
	sendAttack: function(target, troops, onSuccess, onError, sendTime, isSupport) { // {id: 17000, x: 444, y: 666}, [0,0,0,0,0,0,0,0,0,0]
		var self = this;
		if (!this.player.commandSecret) { 
			if (!target.id) {
				var wioski = this.player.worldConfig.wioski,
					n = target.x + '|' + target.y;
				
				if (!wioski) {
					wioski = this.player.worldConfig.wioski = {};
				}

				if (wioski[n]) {
					target.id = wioski[n].id;
				} else {
					this.player.get('api', {
						ajax: 'target_selection',
						input: n,
						type: 'coord',
						request_id: 1,
						limit: Math.floor(Math.random() * 3 + 6),
						offset: 0
					}, function(d) {if (d.villages.length) {target.id = d.villages[0].id; wioski[n] = {x:target.x, y:target.y, id: target.id}; self.sendAttack(target, troops, onSuccess, onError);}});
					return;
				}
			}
			this.player.get('place', {
				ajax: 'command',
				target: target.id,
			}, function(r) {
				var tmp = r.dialog.match(/<input type="hidden" name="([a-z0-9]+)" value="([a-z0-9]+)" \/>/);
				self.player.commandSecret = [tmp[1], tmp[2]];
				self.sendAttack(target, troops, onSuccess, onError, sendTime, isSupport);
			});
			return;
		}
		
		var data = {x:target.x, y:target.y, input: ''};
		if (isSupport) {
			data.support = 'Pomoc';
		} else {
			data.attack = 'Atak';
		}
		data[this.player.commandSecret[0]] = this.player.commandSecret[1];
		
		for (var i = 0; i < units.length; i++) {
			data[units[i]] = (troops[i] || '');
		}
		var agent;
		if (sendTime) {
			agent = new KeepAliveAgent({maxSockets: 1, keepAlive: true, keepAliveMsecs: 20000}); // try not to close connection: more accurate timing
		} 
		this.player.post('place', {
			ajax: 'confirm',
			village: self.id
		}, data, function (result) {
			var data = {x: target.x, y:target.y},
				ch = result.dialog.match(/<input type="hidden" name="ch" value="([a-z0-9]+)" \/>/)[1], 
				action_id = result.dialog.match(/<input type="hidden" name="action_id" value="([0-9]+)" \/>/)[1];

			data[isSupport ? 'support' : 'attack'] = 'true';
			data.ch = ch;
			data.action_id = action_id;
			for (var i = 0; (i < units.length) && (i < troops.length); i++) {
				data[units[i]] = (troops[i] || '');
			}
			if (sendTime) {
				setTimeout(function() {
					self.player.post('place', {
						ajaxaction: 'popup_command',
						village: self.id
					}, data, function () { // result, ret
						if (onSuccess) { onSuccess(); }
					}, function(err) { // ret
						if (onError) { onError(err); }
					}, agent);
				}, sendTime - Date.now() - 150);
			} else {
				self.player.post('place', {
					ajaxaction: 'popup_command',
					village: self.id
				}, data, function () { // result, ret
					if (onSuccess) { onSuccess(); }
				}, function(err) { // ret
					if (onError) { onError(err); }
				});
			}
		}, function(err) { // ret
			if (onError) { onError(err); }
		}, agent);
	},
	manage: function() {
		// var village_id = this.id;
		/*if (VillageId[village_id].lastupdate < new Date().getTime()+10*60*1000) {
			this.updateInfo(village_id);
			return;
		}*/
		// TODO: managing village
		this.getBuildingsData();	
	},

};

function VillageFactory(id,player) {
	var w = Villages[player.world];
	if (!w) {
		w = Villages[player.world] = {};
	}
	var v = w[id];
	if (!v) {
		v = w[id] = new Village(id, player);
	}
	return v;
}

VillageFactory.List = function() {
	Object.defineProperty(this, 'length', {
		value: 0,
		writable: true
	});
	return this;
};
VillageFactory.List.prototype = {};

Object.defineProperty(VillageFactory.List.prototype, 'insert', {
	value: function(v) {
		if (!this[v.id]) {
			this.length++;
		}
		this[v.id] = v;
		return v;
	}
});
Object.defineProperty(VillageFactory.List.prototype, 'remove', {
	value: function(v) {
		if (this[v.id]) {
			this.length--;
			delete this[v.id];
		}
	}
});

module.exports = VillageFactory;