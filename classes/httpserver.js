var http = require('http');

function parseHttpRequest(p, data) {
	var ret=p.cookies.getCookiesString(data.playerdomain, '/');
	return ret;
}

module.exports = function(data) {
	http.createServer(function (req, res) {
		var status = 200, headers = {'Content-Type': 'text/plain'}, r = '';
		(function() {
			if (req.headers.player && req.headers.playerpass && req.headers.playerdomain && req.headers.world){
				for (var i in data.players) {
					if (data.players[i].username !== req.headers.player) {continue;}
					if (data.players[i].httppassword !== req.headers.playerpass) {break;}
					var world = req.headers.world;
					if (!data.players[i].worlds[world]) {r+='No such world!'; status = 405; return;}
					var d = {};
					try {
						d = JSON.parse(req.url.substr(1));
					} catch(e) {}
					d.playerdomain = req.headers.playerdomain;
					r += parseHttpRequest(data.players[i].worlds[world], d);
					return;
				}
				r+=('Player not found!');
				status = 404;
			} else {
				r+=('Headers not found!');
				status = 403;
			}
		})();
		res.writeHead(status, headers);
		res.write(r);
		res.end();
	}).listen(data.port);
	console.log('HTTP server listening on port', data.port);
};
