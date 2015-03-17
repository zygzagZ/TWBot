 var fs = require('fs');
	
require('./classes/utility');
console.log(process.argv);
	
	fs.readFile('./interface.91.json', function(err, val) {
		var util = new Utility(JSON.parse(val));
		console.log(util[process.argv[2]](process.argv[3],process.argv[4],~~process.argv[5]));
		
	});