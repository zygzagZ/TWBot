function CookieManager() {
	this.storage = {};
}
CookieManager.prototype = {
	parse: function(t) {
		var now = new Date().getTime();
		for (var i = 0; i < t.length;i++) {
			var q = t[i].split(';'),
				main = q[0].match(/([^=]+)=(.*)/),
				name = main[1],
				value = main[2];
			
				 	 
			this.storage[name]={value: value};
				
			for (var x = 1; x < q.length; x++) {
				var cur = q[x].trim().match(/([^=]+)=*(.*)/),
					cname = cur[1].toLowerCase(),
					cval = cur[2];
				if (cname == 'path') {
					this.storage[name].path = cval;
				} else if (cname == 'expires') {
					var d = new Date(cval).getTime();
					if (d > now)
						this.storage[name].expires = d;
				} else if (cname == 'max-age') {
					this.storage[name].expires = now + parseInt(cval, 10)*1000;
				} else if (cname == 'domain') {
					this.storage[name].domain = cval;
				}
			}
		}
	}, 
	getCookiesString: function(host, path) {
		var now = new Date().getTime(), result = '';
		for (var i in this.storage) {
			if (this.storage[i].expires) {
				if (this.storage[i].expires < now) {
					delete this.storage[i];
					continue;
				}
			}
			if ( (!this.storage[i].path || this.storage[i].path == path) && (!this.storage[i].domain || host.indexOf(this.storage[i].domain) >= 0) ) {
				result += i + '=' + this.storage[i].value + '; ';
			}
		}	
		return result;
	}
}
module.exports = CookieManager;
