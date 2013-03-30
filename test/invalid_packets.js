//
// Tests for packet validity. Does not test anything about the decode process, just that we can detect invalid packets that fail before we try and decode them.
//

var adsb = require('../lib/adsb.js'),
	assert = require('assert'),
	should = require('should');

describe('packets', function(){
	describe('that are invalid', function(){
		it('should return ERR_PACKET_INVALID when lacking delimiters', function(){
			adsb.decodePacket('').should.equal(adsb.ERR_PACKET_INVALID);
			adsb.decodePacket('*').should.equal(adsb.ERR_PACKET_INVALID);
			adsb.decodePacket(';').should.equal(adsb.ERR_PACKET_INVALID);

			adsb.decodePacket('*;').should.not.equal(adsb.ERR_PACKET_INVALID);
		});

		it('should return ERR_PACKET_TOO_SHORT when too short', function(){
			adsb.decodePacket('*;').should.equal(adsb.ERR_PACKET_TOO_SHORT);

			adsb.decodePacket('*1;').should.not.equal(adsb.ERR_PACKET_TOO_SHORT);
		});

		it('should return ERR_PACKET_TOO_LONG when too long', function(){
			adsb.decodePacket('*8f4d2023587f345e35837e2218b21;').should.equal(adsb.ERR_PACKET_TOO_LONG);

			adsb.decodePacket('*8f4d2023587f345e35837e2218b2;').should.not.equal(adsb.ERR_PACKET_TOO_LONG);
		});
	});

	describe('that are valid', function(){
		it('should look like a packet', function(){
			adsb.decodePacket('*8f4d2023587f345e35837e2218b2;').should.have.keys(['binary','bits','type','crc_ok','crc','errorbit','icao','phase_corrected','ca','metype','mesub','heading_is_valid','heading','aircraft_type','fflag','tflag','raw_latitude','raw_longitude','flight','ew_dir','ew_velocity','ns_dir','ns_velocity','vert_rate_source','vert_rate_sign','vert_rate','velocity','fs','dr','um','identity','altitude','unit']);
		});
	});
});