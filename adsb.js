// Portions from: https://github.com/antirez/dump1090/blob/master/dump1090.c

var net = require('net');

// Config
var host = '192.168.1.144';
var port = 30002;

// Constants
var MODES_LONG_MSG_BITS = 112;
var MODES_SHORT_MSG_BITS = 56;

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

	if (len-2 > MODES_LONG_MSG_BITS / 8){
		console.log('Packet too long');
		return;
	}

	// Convert to binary
	var bytes = [];
	for (var i=1; i<len-1; i+=2){ // Skip beginning and end (* and ;), go 2 chars at a time
		bytes.push(parseInt(data.substr(i, 2), 16));
	}
	console.log('Bytes: '+bytes.join(' '));

	// Decode
	var msg = {
		binary:			bytes,	// Binary message
		bits:			0,	// Number of bits in message
		type:			0,	// Downlink format #

		crc_ok:			false,	// True if CRC was valid
		crc:			0,	// Message CRC
		errorbit:		0,	// Bit corrected. -1 if no bit corrected

		icao:			[],	// ICAO Address bytes 1 2 and 3

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
		fs:			0,	// Flight status for DF4, 5, 20, 21
		dr:			0,	// Request extraction of downlink request
		um:			0,	// Request extraction of downlink request
		identity:		0,	// 13 bits identity (Squawk)

		// Fields used by multiple message types.
		altitude:		0,
		unit:			0
	};

	// Message type is first 5 bits, always present
	// http://www.radartutorial.eu/13.ssr/sr24.en.html
	msg.type = bytes[0] >> 3;
	//console.log('Type: '+msg.type);

	switch (msg.type){
		case 16:
		case 17: // ADS-B
		case 19: // Military
		case 20:
		case 21:
			msg.bits = MODES_LONG_MSG_BITS;
			break;
		default:
			msg.bits = MODES_SHORT_MSG_BITS;
			break;
	}

	// CRC is always the last three bytes
	var num_bytes = msg.bits / 8;
	msg.crc = (bytes[num_bytes - 3] << 16) | (bytes[num_bytes - 2] << 8) | bytes[num_bytes - 1];

	//var crc2 = modesChecksum(bytes, msg.bits);
	var crc2 = modes_check_crc(bytes, msg.bits);
	msg.crc_ok = (msg.crc == crc2);
	//if (!msg.crc_ok) console.log('CRC check failed: '+msg.crc+' vs '+crc2);
	console.log("CRC from message:\t"+msg.crc);
	console.log("CRC from v1:\t\t"+modesChecksum(bytes, msg.bits));
	console.log("CRC from v2:\t\t"+modes_check_crc(bytes, msg.bits));


	// Responder capabilities, always present
	msg.ca = bytes[0] & 7; // Last 3 bits of the first byte
	//console.log('CA: '+msg.ca);

	// ICAO address, always present
	// http://www.radartutorial.eu/13.ssr/sr82.en.html ???
	msg.icao[0] = bytes[1];
	msg.icao[1] = bytes[2];
	msg.icao[2] = bytes[3];

	// DF 17 type (assuming this is a DF17, otherwise not used)
	msg.metype = bytes[4] >> 3; // First 5 bits of byte 5
	msg.mesub = bytes[4] & 7; // Last 3 bits of byte 5

	// Fields for DF4, 5, 20, 21
	msg.fs = bytes[0] & 7;
	msg.dr = bytes[1] >> 3 & 31;
	msg.um = ((bytes[1] & 7) << 3) | bytes[2] >> 5;

	// Return our message hash
	return msg;
}

/* Parity table for MODE S Messages.
 * The table contains 112 elements, every element corresponds to a bit set
 * in the message, starting from the first bit of actual data after the
 * preamble.
 *
 * For messages of 112 bit, the whole table is used.
 * For messages of 56 bits only the last 56 elements are used.
 *
 * The algorithm is as simple as xoring all the elements in this table
 * for which the corresponding bit on the message is set to 1.
 *
 * The latest 24 elements in this table are set to 0 as the checksum at the
 * end of the message should not affect the computation.
 *
 * Note: this function can be used with DF11 and DF17, other modes have
 * the CRC xored with the sender address as they are reply to interrogations,
 * but a casual listener can't split the address from the checksum.
 */

var modes_checksum_table = [
	0x3935ea, 0x1c9af5, 0xf1b77e, 0x78dbbf, 0xc397db, 0x9e31e9, 0xb0e2f0, 0x587178,
	0x2c38bc, 0x161c5e, 0x0b0e2f, 0xfa7d13, 0x82c48d, 0xbe9842, 0x5f4c21, 0xd05c14,
	0x682e0a, 0x341705, 0xe5f186, 0x72f8c3, 0xc68665, 0x9cb936, 0x4e5c9b, 0xd8d449,
	0x939020, 0x49c810, 0x24e408, 0x127204, 0x093902, 0x049c81, 0xfdb444, 0x7eda22,
	0x3f6d11, 0xe04c8c, 0x702646, 0x381323, 0xe3f395, 0x8e03ce, 0x4701e7, 0xdc7af7,
	0x91c77f, 0xb719bb, 0xa476d9, 0xadc168, 0x56e0b4, 0x2b705a, 0x15b82d, 0xf52612,
	0x7a9309, 0xc2b380, 0x6159c0, 0x30ace0, 0x185670, 0x0c2b38, 0x06159c, 0x030ace,
	0x018567, 0xff38b7, 0x80665f, 0xbfc92b, 0xa01e91, 0xaff54c, 0x57faa6, 0x2bfd53,
	0xea04ad, 0x8af852, 0x457c29, 0xdd4410, 0x6ea208, 0x375104, 0x1ba882, 0x0dd441,
	0xf91024, 0x7c8812, 0x3e4409, 0xe0d800, 0x706c00, 0x383600, 0x1c1b00, 0x0e0d80,
	0x0706c0, 0x038360, 0x01c1b0, 0x00e0d8, 0x00706c, 0x003836, 0x001c1b, 0xfff409,
	0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000,
	0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000,
	0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000
];

// http://www.radartutorial.eu/13.ssr/sr26.en.html
function modesChecksum(bytes, num_bits){
	var crc = 0;
	var offset = (num_bits == MODES_LONG_MSG_BITS) ? 0 : (MODES_LONG_MSG_BITS - MODES_SHORT_MSG_BITS);

	for (var j=0; j<num_bits; j++){
		var b = parseInt(j / 8, 10);
		var bit = j % 8;
		var bitmask = 1 << (7 - bit);

		// If bit is set, xor with corresponding table entry.
		if (bytes[b] & bitmask){
			crc ^= modes_checksum_table[j + offset];
			//console.log('j: '+j+', offset: '+offset+', byte: '+b+', bit: '+bit+', bitmask: '+bitmask+', byte: '+bytes[b]+', bitset: true, xor: '+modes_checksum_table[j + offset]);
		}
		else{
			//console.log('j: '+j+', offset: '+offset+', byte: '+b+', bit: '+bit+', bitmask: '+bitmask+', byte: '+bytes[b]+', bitset: false');
		}
	}

	return crc;
}

/*  Mode S Parity Table
 *   Index is bit position with bit 0 being the first bit after preamble
 *   On short frames an offset of 56 is used.
*/
var modes_crc_table =
[
    0x3935ea,  // Start of Long Frame CRC
    0x1c9af5,
    0xf1b77e,
    0x78dbbf,
    0xc397db,
    0x9e31e9,
    0xb0e2f0,
    0x587178,
    0x2c38bc,
    0x161c5e,
    0x0b0e2f,
    0xfa7d13,
    0x82c48d,
    0xbe9842,
    0x5f4c21,
    0xd05c14,
    0x682e0a,
    0x341705,
    0xe5f186,
    0x72f8c3,
    0xc68665,
    0x9cb936,
    0x4e5c9b,
    0xd8d449,
    0x939020,
    0x49c810,
    0x24e408,
    0x127204,
    0x093902,
    0x049c81,
    0xfdb444,
    0x7eda22,
    0x3f6d11, // Extended 56 bit field
    0xe04c8c,
    0x702646,
    0x381323,
    0xe3f395,
    0x8e03ce,
    0x4701e7,
    0xdc7af7,
    0x91c77f,
    0xb719bb,
    0xa476d9,
    0xadc168,
    0x56e0b4,
    0x2b705a,
    0x15b82d,
    0xf52612,
    0x7a9309,
    0xc2b380,
    0x6159c0,
    0x30ace0,
    0x185670,
    0x0c2b38,
    0x06159c,
    0x030ace,
    0x018567,
    0xff38b7,  // Start of Short Frame CRC
    0x80665f,
    0xbfc92b,
    0xa01e91,
    0xaff54c,
    0x57faa6,
    0x2bfd53,
    0xea04ad,
    0x8af852,
    0x457c29,
    0xdd4410,
    0x6ea208,
    0x375104,
    0x1ba882,
    0x0dd441,
    0xf91024,
    0x7c8812,
    0x3e4409,
    0xe0d800,
    0x706c00,
    0x383600,
    0x1c1b00,
    0x0e0d80,
    0x0706c0,
    0x038360,
    0x01c1b0,
    0x00e0d8,
    0x00706c,
    0x003836,
    0x001c1b,
    0xfff409,
    0x800000,   // 24 PI or PA bits
    0x400000,
    0x200000,
    0x100000,
    0x080000,
    0x040000,
    0x020000,
    0x010000,
    0x008000,
    0x004000,
    0x002000,
    0x001000,
    0x000800,
    0x000400,
    0x000200,
    0x000100,
    0x000080,
    0x000040,
    0x000020,
    0x000010,
    0x000008,
    0x000004,
    0x000002,
    0x000001
];

function modes_check_crc(data, length)
{
	var crc=0, i;
	for(i = 0; i < length; i++)
	{
		if(data[parseInt(i/8, 10)] & (1 << (7-(i%8))))
		{
			crc ^= modes_crc_table[i+(112-length)];
		}
	}
    return crc;
}