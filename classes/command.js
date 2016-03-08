
function Command(att, player) {
	if (typeof att.source === 'number') {
		this.source = player.getVillage(att.source);
	} else if (!att.source.sendAttack && att.source.id) {
		this.source = player.getVillage(att.source.id);
	} else {
		return false;
	}
	this.support = !!att.support;
	this.target = att.target;
	this.troops = att.troops;
	this.time = att.time;
	this.sendTime = att.sendTime;
	if (!player.config) { return this; } // only loading config
	if (!this.sendTime && this.time) {
		this.sendTime = parseInt(this.time,10) - player.util.getTravelTime(this.troops, this.source, this.target, this.support);
		this.time = this.time;
	} else if (!this.time && !this.sendTime) {
		player.sendCommand(this);
		return undefined;
	}
	if (!this.time) {
		this.time = this.sendTime + player.util.getTravelTime(this.troops, this.source, this.target, this.support);
	}
	if (!this.id) {
		this.id = Math.random();
	}

	var i = 0;
	while (i < player.config.commandList.length && player.config.commandList[i].sendTime < this.sendTime) {
		i++;
	}
	if (!this.timeout && (this.sendTime < Date.now() + (i === 0 ? 25*60*60000 : 10000))) { //can schedule it now...
		this.timeout = setTimeout(player.sendCommand.bind(player), Math.max(this.sendTime-2000 - Date.now(), 0), this); // timeout of sendCommand
	}
	if (i === 0) {
		var second_attack = player.config.commandList[0]; // only keep second attack if its in next 10 seconds, else unschedule it
		if (second_attack && second_attack.timeout && second_attack.sendTime > Date.now() + 10000) {
			clearTimeout(second_attack.timeout);
			delete second_attack.timeout;
		}
	}
	player.config.commandList.splice(i, 0, this);
}

Command.prototype.toJSON = function() {
	return {source: this.source.id, target:this.target, id: this.id, time: this.time, sendTime: this.sendTime, support: this.support, troops: this.troops, __type:'Command'};
};

module.exports = Command;