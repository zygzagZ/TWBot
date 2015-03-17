String.prototype.find = function(q,w) {
	var pos = this.indexOf(q,w);
	if (pos == -1) pos = Infinity;
	return pos;
}
String.prototype.findLast = function(q,w) {
	var pos = this.lastIndexOf(q,w);
	if (pos == -1) pos = Infinity;
	return pos;
}
String.prototype.startsWith = function(q) {
	if (this.length < q.length) return false;
	return this.substr(0, q.length) == q;
}

Object.defineProperty(Object.prototype, "extend", {
	enumerable: false,
	value: function() {
		var blockNew = arguments[0] && typeof(arguments[0]) == 'boolean';
		for (var i in arguments) {
			if (typeof(arguments[i]) != 'object') continue;
			var dest = this, source = arguments[i],props = Object.getOwnPropertyNames(source);
			props.forEach(function(name) {
				if (blockNew && !(name in dest)) {
					return true;
				}
				var value = Object.getOwnPropertyDescriptor(source, name);
				Object.defineProperty(dest, name, value);
			});
		}
		return this;
	}
});


global.Utility = function(data) {
	this.data = data;
}
Utility.prototype = {
	buildTime: function(type, lv, hqlv) {
		var b = this.data[type],
			base = (lv < 3) ?
			b.build_time * 1.18 * Math.pow(b.build_time_factor,-13) :
			b.build_time * 1.18 * Math.pow(b.build_time_factor, lv - 1 - 14/(lv-1));
		return Math.round(base * Math.pow(1.05, -hqlv));
	},
	factor: function(factor, type, lv) {
		var b = this.data[type];
		return Math.round(b[factor]*Math.pow(b[factor+'_factor'], lv-1));
	},
	farmPop: function(lv) {
		return Math.round(240*Math.pow(1.172103,(lv - 1)));
	},
	storageCap: function(lv) {
		return Math.round(1000*Math.pow(1.2294934,(lv - 1)));
	},
	production: function(lv) {
		return lv ? Math.round(30*Math.pow(1.163118,(lv - 1))) : 0;
	},
	hideCap: function(lv) {
		return Math.round(150*Math.pow(4/3,(lv - 1)));
	},
	marketCap: function(lv) {
		return lv < 11 ? lv : (lv - 10)*(lv - 10) + 10;
	}
}