#!/usr/bin/nodejs
var Client = require('hangupsjs');
var Q = require('q');
var client = new Client();

// set more verbose logging
client.loglevel('error');

// receive chat message events
client.on('chat_message', function(ev) {
	console.log(ev);
	var msg = ev.chat_message.message_content.segment;
	var txt = '';
	for (var i = 0; i < msg.length; i++) {
		if (msg[i].type === 'TEXT') {
			txt += msg[i].text;
		}
	}
	return console.log(msg);
});

// connect and post a message.
// the id is a conversation id.
client.connect(function() {
	// return {auth: Client.authStdin};
	return {auth: function(){return Q.promise(function(rs){rs('4/22HEt-uAx0iuiSjC_t15VPTNNpyWE-bENbvvi8viduo');})}}
}).then(function() {
	var conversation = client.init.conv_states[0];
	if (!conversation)
		return;
	var conv_id = conversation.conversation_id.id;
	console.log('Conv id: ', conv_id);
	return client.sendchatmessage(conv_id, [
		[0, 'Hello World']
	])
}).done();
this.client = client;

// 108691870855929105037 - Paweł
// 101308743015785250993 - Anon