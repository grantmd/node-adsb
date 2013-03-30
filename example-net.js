var adsb = require('./lib/adsb.js');
var net = require('net');

// Config
var host = '192.168.1.144';
var port = 30002;

// Connect to our datasource and start processing incoming data
var client = net.connect({host: host, port: port}, function(){
	console.log('client connected');
});

client.on('data', function(data){
	// Sometimes we get multiple packets here -- need to split them
	var packets = data.toString().trim().split("\n");
	for (var i in packets){
		adsb.decodePacket(packets[i]);
	}
});

client.on('end', function(){
	console.log('client disconnected');

	// All done, output stats
	var stats = adsb.getStats();
	console.log('------------');
	console.log('Total packets: '+stats.packets);
	console.log('Invalid packets: '+stats.invalid_packets);
	console.log('CRC Errors: '+stats.crc_errors);
});

client.on('error', function(){
	console.log('connection error');
});