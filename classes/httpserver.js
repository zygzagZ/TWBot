var http = require('http');

function parseHttpRequest(p, data) {
	var ret = '', i, cmd;
	if (data.type === 'cookies') {
		if (typeof data.playerdomain === 'string') {
			return p.cookies.getCookiesString(data.playerdomain, '/');
		}
	} else if (data.type === 'addCommand') {
		if (typeof data.command === 'object') {
			cmd = data.command;
			if (cmd.source && cmd.target && (cmd.time || cmd.sendTime) && cmd.troops) {
				if (!p.addCommand(cmd)) {
					return [403, '{"error":"Invalid data given."}'];
				}
				return '{"id":' + cmd.id + '}';
			}
			return [403, '{"error":"No source, target, time, sendTime or troops given."}'];
		}
		return [403, '{"error":"No data given."}'];
	} else if (data.type === 'commandList') {
		ret = [];
		for (i = 0; i < p.config.commandList.length; i++) {
			cmd = p.config.commandList[i];
			ret.push({source:{x:cmd.source.x, y:cmd.source.y, id:cmd.source.id, name:cmd.source.name}, target: cmd.target, troops: cmd.troops, time: cmd.time, id:cmd.id});
		}
		return JSON.stringify(ret);
	} else if (data.type === 'commandInfo') {
		if (typeof data.id !== 'number') {
			return [403, '{"error":"No command id."}'];
		}
		for (i = 0; i < p.config.commandList.length; i++) {
			cmd = p.config.commandList[i];
			if (cmd.id === data.id) {
				return JSON.stringify({source:{x:cmd.source.x, y:cmd.source.y, id:cmd.source.id, name:cmd.source.name}, target: cmd.target, troops: cmd.troops, time: cmd.time, id:cmd.id});
			}
		}
		return [403, '{"error":"Non-existent command id."}'];
	} else if (data.type === 'removeCommand') {
		if (typeof data.id !== 'number') {
			return [403, '{"error":"No command id."}'];
		}
		for (i = 0; i < p.config.commandList.length; i++) {
			if (p.config.commandList[i].id === data.id) {
				p.config.commandList.splice(i, 1);
				return '';
			}
		}
		return [403, '{"error":"Non-existent command id."}'];
	} else if (data.type === 'villageList') {
		ret = [];
		for (i in p.data.villageList) {
			ret.push({x:p.data.villageList[i].x, y:p.data.villageList[i].y, id:p.data.villageList[i].id, name:p.data.villageList[i].name});
		}
		return JSON.stringify(ret);
	}
	return '';
}

module.exports = function(data) {
	http.createServer(function (req, res) {
		var status = 200, headers = {'Content-Type': 'text/plain'}, r = '';
		var post_data = '';
		if (req.headers.player && req.headers.playerpass && req.headers.world){
			for (var i in data.players) {
				if (data.players[i].username !== req.headers.player) {continue;}
				if (data.players[i].httppassword !== req.headers.playerpass) {break;}
				var world = req.headers.world;
				if (!data.players[i].worlds[world]) {r+='No such world!'; status = 405; break;}
				req.on('data', function(data){post_data += data;});
				req.on('end', function() {
					var d = {};
					try {
						d = JSON.parse(post_data);
					} catch(e) {}
					if (!d.playerdomain && req.headers.playerdomain) {
						d.playerdomain = req.headers.playerdomain;
					}
					var response = parseHttpRequest(data.players[i].worlds[world], d, headers);
					if (typeof response !== 'object') {
						res.writeHead(200, headers);
						res.write(response);	
					} else {
						res.writeHead(response[0], headers);
						res.write(response[1]);
					}
					res.end();
				});
				return;
			}
			r+=('Player not found!');
			status = 404;
		} else {
			r+=('Headers not found!');
			status = 403;
		}
		res.writeHead(status, headers);
		res.write(r);
		res.end();
	}).listen(data.port);
	console.log('HTTP server listening on port', data.port);
};
