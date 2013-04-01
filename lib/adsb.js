// Portions from: https://github.com/antirez/dump1090/blob/master/dump1090.c

exports = module.exports;

// Constants
var DEBUG = false;
var MODES_LONG_MSG_BITS = 112;
var MODES_SHORT_MSG_BITS = 56;
var MODES_UNIT_FEET = 0;
var MODES_UNIT_METERS = 1;

var ERR_PACKET_INVALID = exports.ERR_PACKET_INVALID = 0;
var ERR_PACKET_TOO_SHORT = exports.ERR_PACKET_TOO_SHORT = -1;
var ERR_PACKET_TOO_LONG = exports.ERR_PACKET_TOO_LONG = -2;

var stats = {
	packets: 0,
	invalid_packets: 0,
	crc_errors: 0
};

exports.getStats = function(){
	return stats;
};

exports.resetStats = function(){
	for (var i in stats){
		stats[i] = 0;
	}
};

// Takes a string and decodes it, testing validity
// Returns a hash describing the packet
exports.decodePacket = function(data){
	stats.packets++;
	var len = data.length;

	if (DEBUG) console.log('Packet ('+len+'): '+data);

	// Test validity
	if (data[0] != '*' || data[len-1] != ';'){
		stats.invalid_packets++;
		if (DEBUG) console.log('Invalid packet');
		return ERR_PACKET_INVALID;
	}

	if (len <= 2){
		stats.invalid_packets++;
		if (DEBUG) console.log('Packet too short');
		return ERR_PACKET_TOO_SHORT;
	}

	if (len-2 > MODES_LONG_MSG_BITS / 4){
		stats.invalid_packets++;
		if (DEBUG) console.log('Packet too long');
		return ERR_PACKET_TOO_LONG;
	}

	// Convert to binary
	var bytes = [];
	for (var i=1; i<len-1; i+=2){ // Skip beginning and end (* and ;), go 2 chars at a time
		bytes.push(parseInt(data.substr(i, 2), 16));
	}
	if (DEBUG) console.log('Bytes: '+bytes.join(' '));

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
	if (DEBUG) console.log('Type '+msg.type+': '+this.messageTypeToString(msg.type));

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
	if (DEBUG) console.log('Bits: '+msg.bits+', Bytes: '+num_bytes);
	msg.crc = (bytes[num_bytes - 3] << 16) | (bytes[num_bytes - 2] << 8) | bytes[num_bytes - 1];

	// Calculate our own and compare it
	var crc2 = this.modesChecksum(bytes, msg.bits);
	msg.crc_ok = (msg.crc == crc2);
	if (!msg.crc_ok){
		stats.crc_errors++;
		if (DEBUG) console.log('!!!!!!!!!!!!!!! CRC check failed: '+msg.crc+' vs '+crc2);

		// TODO: Attempt to recover the message here
	}

	// Responder capabilities, always present
	msg.ca = bytes[0] & 7; // Last 3 bits of the first byte
	if (DEBUG) console.log('CA '+msg.ca+': '+this.responderCapabilitiesToString(msg.ca));

	// ICAO address, always present
	// http://www.radartutorial.eu/13.ssr/sr82.en.html ???
	msg.icao[0] = bytes[1];
	msg.icao[1] = bytes[2];
	msg.icao[2] = bytes[3];

	// DF 17 type (assuming this is a DF17, otherwise not used)
	if (msg.type == 17){
		msg.metype = bytes[4] >> 3; // First 5 bits of byte 5
		msg.mesub = bytes[4] & 7; // Last 3 bits of byte 5
		if (DEBUG) console.log('Extended Squitter Type '+msg.metype+', Subtype: '+msg.mesub+': '+this.meTypeToString(msg.metype, msg.mesub));
	}

	// Fields for DF4, 5, 20, 21
	msg.fs = bytes[0] & 7;
	msg.dr = bytes[1] >> 3 & 31;
	msg.um = ((bytes[1] & 7) << 3) | bytes[2] >> 5;
	console.log('Flight Status '+msg.fs+': '+this.flightStatusToString(msg.fs));

	// Decode 13 bit altitude for DF0, DF4, DF16, DF20
	// This is mostly in "short" messages, except DF20, which is "long" or "extended"
	if (msg.type === 0 || msg.type == 4 || msg.type == 16 || msg.type == 20){
		var ac13 = this.decodeAC13Field(bytes);
		if (ac13){
			msg.altitude = ac13.altitude;
			msg.unit = ac13.unit;
			console.log('AC13 Altitude: '+msg.altitude+', Units: '+((msg.unit == MODES_UNIT_FEET) ? 'ft' : 'm'));
		}
		else{
			console.log('Could not decode AC13');
		}
	}

	// Decode extended squitter specific stuff for type "ADS-B message"
	if (msg.msgtype == 17){
		// Decode the extended squitter message.
		if (msg.metype >= 1 && msg.metype <= 4){
			// Aircraft Identification and Category
			msg.aircraft_type = msg.metype-1;
			msg.flight[0] = ais_charset[bytes[5]>>2];
			msg.flight[1] = ais_charset[((bytes[5]&3)<<4)|(bytes[6]>>4)];
			msg.flight[2] = ais_charset[((bytes[6]&15)<<2)|(bytes[7]>>6)];
			msg.flight[3] = ais_charset[bytes[7]&63];
			msg.flight[4] = ais_charset[bytes[8]>>2];
			msg.flight[5] = ais_charset[((bytes[8]&3)<<4)|(bytes[9]>>4)];
			msg.flight[6] = ais_charset[((bytes[9]&15)<<2)|(bytes[10]>>6)];
			msg.flight[7] = ais_charset[bytes[10]&63];
			msg.flight[8] = '\0';
		}
		else if (msg.metype >= 9 && msg.metype <= 18){
			// Airborne Position (Baro Altitude)
			msg.fflag = bytes[6] & (1<<2);
			msg.tflag = bytes[6] & (1<<3);
			var ac12 = this.decodeAC12Field(bytes);
			if (ac12){
				msg.altitude = ac12.altitude;
				msg.unit = ac12.unit;
				console.log('AC12 Altitude: '+msg.altitude+', Units: '+((msg.unit == MODES_UNIT_FEET) ? 'ft' : 'm'));
			}
			else{
				console.log('Could not decode AC12');
			}
			msg.raw_latitude = ((bytes[6] & 3) << 15) | (bytes[7] << 7) | (bytes[8] >> 1);
			msg.raw_longitude = ((bytes[8]&1) << 16) | (bytes[9] << 8) | bytes[10];
		}
		else if (msg.metype == 19 && msg.mesub >= 1 && msg.mesub <= 4){
			// Airborne Velocity Message
			if (msg.mesub == 1 || msg.mesub == 2){
				msg.ew_dir = (bytes[5]&4) >> 2;
				msg.ew_velocity = ((bytes[5]&3) << 8) | bytes[6];
				msg.ns_dir = (bytes[7]&0x80) >> 7;
				msg.ns_velocity = ((bytes[7]&0x7f) << 3) | ((bytes[8]&0xe0) >> 5);
				msg.vert_rate_source = (bytes[8]&0x10) >> 4;
				msg.vert_rate_sign = (bytes[8]&0x8) >> 5;
				msg.vert_rate = ((bytes[8]&7) << 6) | ((bytes[9]&0xfc) >> 2);

				// Compute velocity and angle from the two speed components.
				msg.velocity = sqrt(msg.ns_velocity*msg.ns_velocity+msg.ew_velocity*msg.ew_velocity);
				if (msg.velocity){
					var ewv = msg.ew_velocity;
					var nsv = msg.ns_velocity;
					var heading;

					if (msg.ew_dir) ewv *= -1;
					if (msg.ns_dir) nsv *= -1;
					heading = atan2(ewv,nsv);

					// Convert to degrees.
					msg.heading = heading * 360 / (M_PI*2);

					// We don't want negative values but a 0-360 scale.
					if (msg.heading < 0) msg.heading += 360;
				}
				else{
					msg.heading = 0;
				}
			}
			else if (msg.mesub == 3 || msg.mesub == 4){
				msg.heading_is_valid = bytes[5] & (1<<2);
				msg.heading = (360.0/128) * (((bytes[5] & 3) << 5) | (bytes[6] >> 3));
			}
		}
	}

	// Return our message hash
	console.log('');
	return msg;
};

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
exports.modesChecksum = function(bytes, num_bits){
	var crc = 0;
	var offset = (num_bits == MODES_LONG_MSG_BITS) ? 0 : (MODES_LONG_MSG_BITS - MODES_SHORT_MSG_BITS);

	for (var j=0; j<num_bits; j++){
		var b = parseInt(j / 8, 10);
		var bit = j % 8;
		var bitmask = 1 << (7 - bit);

		// If bit is set, xor with corresponding table entry.
		if (bytes[b] & bitmask){
			crc ^= modes_checksum_table[j + offset];
		}
	}

	return crc;
};

// Convert downlink format (DF) # to string
exports.messageTypeToString = function(type){
	switch (type){
		case 0:
			return 'Short Air-Air Surveillance';

		case 4:
		case 20:
			return ((type == 4) ? "Surveillance" : "Comm-B")+", Altitude Reply";

		case 5:
		case 21:
			return ((type == 5) ? "Surveillance" : "Comm-B")+", Identity Reply";

		case 11:
			return "All Call Reply";

		case 17:
			return "ADS-B message";

		default:
			return "Unknown type: "+type;
	}
};

// Convert responder capabilities
exports.responderCapabilitiesToString = function(ca){
	switch (ca){
		case 0:
			return "Level 1 (Surveillance Only)";

		case 1:
			return "Level 2 (DF0,4,5,11)";

		case 2:
			return "Level 3 (DF0,4,5,11,20,21)";

		case 3:
			return "Level 4 (DF0,4,5,11,20,21,24)";

		case 4:
			return "Level 2+3+4 (DF0,4,5,11,20,21,24,code7 - is on ground)";

		case 5:
			return "Level 2+3+4 (DF0,4,5,11,20,21,24,code7 - is on airborne)";

		case 6:
			return "Level 2+3+4 (DF0,4,5,11,20,21,24,code7)";

		case 7:
			return "Level 7 ???";

		default:
			return "Unknown CA: "+ca;
	}
};

// Convert extended squitter type and subtype to string
exports.meTypeToString = function(metype, mesub){
	var mename = "Unknown";

	if (metype >= 1 && metype <= 4){
		mename = "Aircraft Identification and Category";
	}
	else if (metype >= 5 && metype <= 8){
		mename = "Surface Position";
	}
	else if (metype >= 9 && metype <= 18){
		mename = "Airborne Position (Baro Altitude)";
	}
	else if (metype == 19 && mesub >= 1 && mesub <= 4){
		mename = "Airborne Velocity";
	}
	else if (metype >= 20 && metype <= 22){
		mename = "Airborne Position (GNSS Height)";
	}
	else if (metype == 23 && mesub === 0){
		mename = "Test Message";
	}
	else if (metype == 24 && mesub == 1){
		mename = "Surface System Status";
	}
	else if (metype == 28 && mesub == 1){
		mename = "Extended Squitter Aircraft Status (Emergency)";
	}
	else if (metype == 28 && mesub == 2){
		mename = "Extended Squitter Aircraft Status (1090ES TCAS RA)";
	}
	else if (metype == 29 && (mesub === 0 || mesub == 1)){
		mename = "Target State and Status Message";
	}
	else if (metype == 31 && (mesub === 0 || mesub == 1)){
		mename = "Aircraft Operational Status Message";
	}

	return mename;
};

// Convert flight status
exports.flightStatusToString = function(fs){
	switch (fs){
		case 0:
			return "Normal, Airborne";

		case 1:
			return "Normal, On the ground";

		case 2:
			return "ALERT, Airborne";

		case 3:
			return "ALERT, On the ground";

		case 4:
			return "ALERT & Special Position Identification. Airborne or Ground";

		case 5:
			return "Special Position Identification. Airborne or Ground";

		default:
			return "Unknown flight status: "+fs;
	}
};

// Decode the 13 bit AC altitude field (in DF 20 and others).
// Returns the altitude and unit as a hash.
// Unit is either MODES_UNIT_METERS or MDOES_UNIT_FEETS.
exports.decodeAC13Field = function(bytes) {
	var m_bit = bytes[3] & (1<<6);
	var q_bit = bytes[3] & (1<<4);

	if (!m_bit){
		if (q_bit){
			// N is the 11 bit integer resulting from the removal of bit Q and M
			var n = ((bytes[2]&31)<<6) | ((bytes[3]&0x80)>>2) | ((bytes[3]&0x20)>>1) | (bytes[3]&15);

			// The final altitude is due to the resulting number multiplied by 25, minus 1000.
			return {
				altitude: (n * 25)-1000,
				unit: MODES_UNIT_FEET
			};
		}
		else{
			// TODO: Implement altitude where Q=0 and M=0
			return 0;
		}
	}
	else{
		// TODO: Implement altitude when meter unit is selected.
		return 0;
	}
};

// Decode the 12 bit AC altitude field (in DF 17 and others).
// Returns the altitude and the unit as a hash
exports.decodeAC12Field = function(bytes){
	var q_bit = bytes[5] & 1;

	if (q_bit) {
		// N is the 11 bit integer resulting from the removal of bit Q
		var n = ((bytes[5]>>1)<<4) | ((bytes[6]&0xF0) >> 4);

		// The final altitude is due to the resulting number multiplied by 25, minus 1000.
		return {
			altitude: (n * 25)-1000,
			unit: MODES_UNIT_FEET
		};
	}
	else{
		// TODO
		return 0;
	}
};