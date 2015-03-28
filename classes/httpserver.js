var http = require('http');

module.exports = function(data) {
	http.createServer(function (req, res) {
		var status = 200, headers = {'Content-Type': 'text/plain'}, r = '';
		(function() {
			if (req.headers.player && req.headers.playerpass && req.headers.playerdomain){
				for (var i in data.players) {
					if (data.players[i].username !== req.headers.player) {continue;}
					if (data.players[i].httppassword !== req.headers.playerpass) {break;}
					var c = data.players[i].cookies.getCookiesString(req.headers.playerdomain, '/');
					r+=(c);
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
	console.log('HTTP server listening on', data.port);
}
