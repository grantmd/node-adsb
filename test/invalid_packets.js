var adsb = require('../lib/adsb.js'),
	assert = require('assert'),
	should = require('should');

describe('packets', function(){
	describe('are invalid', function(){
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
});