var net = require('net');

var host = '192.168.1.144';
var port = 30002;

var client = net.connect({host: host, port: port}, function() { //'connect' listener
	console.log('client connected');
});

client.on('data', function(data) {
	console.log(data.toString());
});

client.on('end', function() {
	console.log('client disconnected');
});