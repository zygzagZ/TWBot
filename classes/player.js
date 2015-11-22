var UserAgents = include('classes/useragents'),
	RawRequest = include('classes/net'),
	
	// hangoutsBot = require('hangouts-bot'),
	Q = require('q'),
	Hangups = require('hangupsjs'),
	World = include('classes/world');

	
function Player(data) {
	var self = this;
	this.username = data.username;
	this.password = data.password;
	this.httppassword = data.httppass;
	this.userAgent = UserAgents.random();
	
	var worldsBuilder = data.worlds.join(', ');
	this.worlds = {toString:function(){return worldsBuilder;}};
	for (var i = 0; i  < data.worlds.length; i++) {
		var WorldData = {username:data.username, password:data.password, userAgent: this.userAgent, world: data.worlds[i], player:this};
		this.worlds[data.worlds[i]] = new World(WorldData);
	}

	if (data.hangouts && data.hangouts.token) {
		var bot = this.hangouts = new Hangups();
		bot.allow = data.hangouts.allow;
		bot.context = {};
		var reconnect = function() {
			bot.connect(function() {
				return {auth: function(){return Q.promise(function(rs){rs(data.hangouts.token)})}}
			}).then(function() {
				var conversation = bot.init.conv_states[0];
				if (!conversation)
					return;

				var conv_id = conversation.conversation_id.id;
				console.log(self.username + ': Hangouts online.');
				return bot.sendchatmessage(bot.conv_id, [
					[0, 'Hello!']
				])
			});
		};
		bot.on('connect_failed', function(err) {
			if (err.code === 403) {
				console.log("Failed to connect to hangouts, auth invalid. (403)");
			} else {
				setTimeout(reconnect,3000);
			}
		});
		bot.on('chat_message', function(ev) {
			var sender = ev.sender_id.chat_id;
			if (sender === ev.self_event_state.user_id.chat_id) // current user message
				return;

			var conv_id = ev.conversation_id.id;
			if (data.hangouts.allow.indexOf(sender) < 0) {
				if (!data.hangouts.suppressWarning) {
					bot.sendchatmessage(conv_id, [[0, 'Hello, ' + sender + '. I am not allowed to communicate with you.']]);
				}
				return;
			}
			var msg = ev.chat_message.message_content.segment;
			var txt = '';
			for (var i = 0; i < msg.length; i++) {
				if (msg[i].type === 'TEXT') {
					txt += msg[i].text;
				}
			}
			console.log(conv_id + '>> ' + txt);
			msg = self.onHangoutsMessage(conv_id, txt);
			if (msg && msg.length) {
				bot.sendchatmessage(conv_id, [[0, msg]]);
			}
		});
		reconnect();
	}

}

Player.prototype = {
	onHangoutsMessage: function(from, message) {
		// TODO: parse hangouts commands and eventually respond
		var data = this.hangouts.context[from];
		if (typeof data !== 'object') {
			data = this.hangouts.context[from] = {};
		}
		message=message.toLowerCase();
		if (!data.worldid) {
			if (message.startsWith('world ')) {
				message = message.substr(6);
			}
			if (!this.worlds[message]) {
				return 'You have to select world first! (' + this.worlds + ')';
			} else {
				data.worldid = message;
				if (!this.hangouts.context[from][data.worldid]) {
					this.hangouts.context[from][data.worldid] = {};
				}
				return 'Selected world "'+data.worldid+'"';
			}
		}
		return this.worlds[data.worldid].onHangoutsMessage(from, message, this.hangouts.context[from][data.worldid]);
	},
	notify: function(what, to) {
		if (!this.hangouts) return false;
		if (!what) return false;
		if (!to) to = this.hangouts.conv_id;
		return this.hangouts.sendchatmessage(to, [[0, what]]);
	}
};
module.exports = Player;
