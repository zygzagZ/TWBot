var UserAgents = include('classes/useragents'),
	RawRequest = include('classes/net'),
	
	hangoutsBot,
	World = include('classes/world');

	
function Player(data) {
	var self = this;
	this.username = data.username;
	this.password = data.password;
	this.httppassword = data.httppass;
	this.userAgent = UserAgents.random();
	var worldsBuilder = data.worlds.join(', ')
	this.worlds = {toString:function(){return worldsBuilder;}};
	console.log("WORLDS: ", worldsBuilder);
	for (var i = 0; i  < data.worlds.length; i++) {
		var WorldData = {username:data.username, password:data.password, userAgent: this.userAgent, world: data.worlds[i]};
		this.worlds[data.worlds[i]] = new World(WorldData);
	}
	
	if (data.hangouts && data.hangouts.username && data.hangouts.password && data.hangouts.allow && data.hangouts.allow.length) {
		if (!hangoutsBot) hangoutsBot = require("hangouts-bot");
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
	onHangoutsMessage: function(from, message) {
		// TODO: parse hangouts commands and eventually respond
		var data = this.hangouts.context[from];
		if (typeof data != 'object') {
			data = this.hangouts.context[from] = {};
		}
		message=message.toLowerCase();
		if (!data.worldid) {
			if (message.startsWith('world ')) {
				message = message.substr(6);
			}
			if (!this.worlds[message]) {
				return "You have to select world first! (" + this.worlds + ')';
			} else {
				data.worldid = message;
				if (!this.hangouts.context[from][data.worldid]) {
					this.hangouts.context[from][data.worldid] = {};
				}
				return 'Selected world "'+data.worldid+'"';
			}
		}
		return this.worlds[data.worldid].onHangoutsMessage(from, message, this.hangouts.context[from][data.worldid]);
	}
}
module.exports = Player;
