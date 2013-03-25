// Portions from: https://github.com/antirez/dump1090/blob/master/dump1090.c

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
		decodePacket(packets[i]);
	}
});

client.on('end', function(){
	console.log('client disconnected');
});

// Takes a string and decodes it, testing validity
// Returns a hash describing the packet
function decodePacket(data){
	var len = data.length;

	console.log('Packet ('+len+'): '+data);

	// Test validity
	if (data[0] != '*' || data[len-1] != ';'){
		console.log('Invalid packet');
		return;
	}

	if (len < 2){
		console.log('Packet too short');
		return;
	}

	if (len-2 > 28){ // TODO: Make this a constant
		console.log('Packet too long');
		return;
	}

	// Convert to binary
	var bytes = [];
	for (var i=1; i<len-1; i+=2){ // Skip beginning and end (* and ;), go 2 chars at a time
		bytes.push(parseInt(data.substr(i, 2), 16));
	}

	// Decode
	var msg = {
		binary:			bytes,	// Binary message
		bits:			0,	// Number of bits in message
		type:			0,	// Downlink format #

		crc_ok:			false,	// True if CRC was valid
		crc:			0,	// Message CRC
		errorbit:		0,	// Bit corrected. -1 if no bit corrected

		// ICAO Address bytes 1 2 and 3
		aa1:			0,
		aa2:			0,
		aa3:			0,

		phase_corrected:	false,	// True if phase correction was applied

		// DF 11
		ca:			0,	// Responder capabilities

		// DF 17
		metype:			0,	// Extended squitter message type
		mesub:			0,	// Extended squitter message subtype
		heading_is_valid:	false,
		heading:		0,
		aircraft_type:		0,
		fflag:			0,	// 1 = Odd, 0 = Even CPR message
		tflag:			0,	// UTC synchronized?
		raw_latitude:		0,	// Non decoded latitude
		raw_longitude:		0,	// Non decoded longitude
		flight:			'',	// 8 chars flight number
		ew_dir:			0,	// 0 = East, 1 = West
		ew_velocity:		0,	// E/W velocity
		ns_dir:			0,	// 0 = North, 1 = South
		ns_velocity:		0,	// N/S velocity
		vert_rate_source:	0,	// Vertical rate source
		vert_rate_sign:		0,	// Vertical rate sign
		vert_rate:		0,	// Vertical rate
		velocity:		0,	// Computed from EW and NS velocity

		// DF4, DF5, DF20, DF21
		fs:			0,	// Flight status for DF4,5,20,21
		dr:			0,	// Request extraction of downlink request
		um:			0,	// Request extraction of downlink request
		identity:		0,	// 13 bits identity (Squawk)

		// Fields used by multiple message types.
		altitude:		0,
		unit:			0
	};

	return msg;
}