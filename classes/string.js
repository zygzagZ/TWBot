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