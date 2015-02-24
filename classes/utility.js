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