//
// Tests for CRC checks
//

var adsb = require('../lib/adsb.js'),
	assert = require('assert'),
	should = require('should');

describe('packets', function(){
	describe('with bad crc', function(){
		it('should fail the crc check', function(){
			var packet = adsb.decodePacket('*7f4d2023587f345e35837e2218b2;');
			packet.should.include({crc_ok: false});
			packet.should.include({crc: 0x587f34});
		});
	});

	describe('with good crc', function(){
		it('should pass the crc check', function(){
			var packet = adsb.decodePacket('*8f4d2023587f345e35837e2218b2;');
			packet.should.include({crc_ok: true});
			packet.should.include({crc: 0x2218b2});
		});
	});
});