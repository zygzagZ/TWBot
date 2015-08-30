var Villages = {};
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
	manage: function() {
		var village_id = this.id;
		/*if (VillageId[village_id].lastupdate < new Date().getTime()+10*60*1000) {
			this.updateInfo(village_id);
			return;
		}*/
		// TODO: managing village
		// TODO: refactor building queue
		// TODO: instead of checking every 30 mins remember when to check (when needs for next building in queue are met)
		var player = this.player;		
		function building() {
			player.request({
				url:'http://pl'+player.world+'.plemiona.pl/game.php?village='+village_id+'&screen=main',
				callback: function(str) {
					var order_count = 0;
					if (str.indexOf('BuildingMain.order_count') > 0) {
						order_count = parseInt(str.match(/BuildingMain.order_count = (\d+)/)[1], 10);
					}
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
						var d;
						for (var i = 0; i < buildingOrder.length; i++) {
							d = buildingOrder[i].split(',');
							if (d.length<2) {
								d[1] = 1;
							}
							if (d[0] === 'eco') {
								if (eco[1] < parseInt(d[1], 10)) {
									building = eco[0];
									break;
								}
							} else if (checkLevel(d[0]) < parseInt(d[1], 10)) {
								building = d[0];
								break;
							}
						}
						if (building === '') {
							return;
						}
						while (building.length) {
							d = BuildingsData[building];
							var err = d.error || '',
								needFarm = err.indexOf(BuildingsData.farm.name) >= 0, // need to build farm first
								needStorage = err.indexOf(BuildingsData.storage.name) >= 0; // need to build storage first
								

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
						console.log('BUILDING: ' + id);
						player.request({
							url: BuildingsData[id].build_link,
							callback: function() {
								var buildtime = BuildingsData[id].build_time * 1000;
								if (order_count < 2-1) {
									buildtime = Math.min(buildtime, Math.random()*5000+3000);
								}
								
								setTimeout(building, buildtime);
								console.log('set new build timeout in ' + buildtime/1000 + ' seconds.');
							}
						});
						
					} else { // check again in 30 minutes
						setTimeout(building, 30*60*1000);
						console.log('set new check timeout in ' + 30*60 + ' seconds.');
					}
				}
			});
		}
		building();
	},

};
module.exports = function(id,player) {
	var w = Villages[player.world];
	if (!w) {
		w = Villages[player.world] = {};
	}
	var v = w[id];
	if (!v) {
		v = w[id] = new Village(id, player);
	}
	return v;
};
