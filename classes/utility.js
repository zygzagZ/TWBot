String.prototype.find = function(q,w) {
	var pos = this.indexOf(q,w);
	if (pos === -1) { pos = Infinity; }
	return pos;
};
String.prototype.findLast = function(q,w) {
	var pos = this.lastIndexOf(q,w);
	if (pos === -1) { pos = Infinity; }
	return pos;
};
String.prototype.startsWith = function(q) {
	if (this.length < q.length) { return false; }
	return this.substr(0, q.length) === q;
};

String.prototype.distance = function (b) { //levenshtein algorithm
	var a = this;
	if (a === b) { return 0; }

	var aLen = a.length, bLen = b.length;

	if (!aLen) { return bLen; }
	if (!bLen) { return aLen; }

	var len = aLen + 1,
		v0 = new Array(len),
		v1 = new Array(len),
		c2, min, tmp,
		i = 0,
		j = 0;

	while(i < len) { v0[i] = i++; }

	while(j < bLen) {
		v1[0] = j + 1;
		c2 = b.charAt(j++);
		i = 0;

		while(i < aLen) {
			min = v0[i] - (a.charAt(i) === c2 ? 1 : 0);
			if (v1[i] < min) { min = v1[i]; }
			if (v0[++i] < min) { min = v0[i]; }
			v1[i] = min + 1;
		}

		tmp = v0; v0 = v1; v1 = tmp;
	}
	return v0[aLen];
};

function extendIterateFunction(source, dest, blockNew, name) {
	if (blockNew && !(name in dest)) { return true; }
	var value = Object.getOwnPropertyDescriptor(source, name);
	Object.defineProperty(dest, name, value);
}

Object.defineProperty(Object.prototype, 'extend', {
	enumerable: false,
	writable: true,
	value: function() {
		var blockNew = arguments[0] && typeof(arguments[0]) === 'boolean';
		for (var i in arguments) {
			if (typeof(arguments[i]) !== 'object') { continue; }
			var dest = this, source = arguments[i],props = Object.getOwnPropertyNames(source);
			props.forEach(extendIterateFunction.bind(null, source, dest, blockNew));
		}
		return this;
	}
});
Object.defineProperty(Array.prototype, 'random', {
	enumerable: false,
	value: function() {
		return this[Math.floor(Math.random()*this.length)];
	}
});
var units_speed = [18, 22, 18, 18, 9, 10, 10, 11, 30, 30, 10, 35];

global.Utility = function(data) {
	this.data = data;
};
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
	},
	distance: function(a, b) {
		return Math.sqrt((a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y))
	},
	getTravelTime: function(troops, a, b, type) {
		var len = troops.length;
		if (units_speed.length < len)
			len = units_speed.length;
		var speed = 0;
		if (type && len > 10 && troops[10] > 0) { // it's support with knight
			speed = 10;
		} else { // it's attack or support without knight
			for (var i = 0; i < len; i++) {
				if (troops[i] > 0)
					if (speed < units_speed[i])
						speed = units_speed[i];
			}

		}
		var dist = this.distance(a,b);
		return speed * 60000 * dist;
	}
};
global.rand = function(a,b) {
	if (a>b) {
		var c = a;
		a = b;
		b = c;
	}
	return a+Math.floor(Math.random()*(b-a));
};
