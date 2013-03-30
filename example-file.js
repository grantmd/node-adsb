var adsb = require('./lib/adsb.js');
var fs = require('fs');

var filename = process.argv[2];
if (!filename){
	console.error("You must specify a filename.");
}
else{
	// Open the file and start parsing it
	fs.readFile(filename, function(err, data){
		if (err) throw err;

		// Split lines and process them one at a time
		var packets = data.toString().trim().split("\n");
		for (var i in packets){
			adsb.decodePacket(packets[i]);
		}

		// All done, output stats
		var stats = adsb.getStats();
		console.log('------------');
		console.log('Total packets: '+stats.packets);
		console.log('Invalid packets: '+stats.invalid_packets);
		console.log('CRC Errors: '+stats.crc_errors);
	});
}