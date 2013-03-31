//
// Tests for CRC checks
//

var adsb = require('../lib/adsb.js'),
	assert = require('assert'),
	should = require('should');

describe('checksum', function(){
	it('should calculate correctly', function(){
		var bytes = [
			143,
			77,
			32,
			35,
			88,
			127,
			52,
			94,
			53,
			131,
			126,
			34,
			24,
			178
		];
		adsb.modesChecksum(bytes, bytes.length*8).should.equal(0x2218b2)
	});
});

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

	describe('with bad crc that can be recovered', function(){
		// These are all fixable packets, and should be moved into another test once we can make them pass the CRC check
		it('should fail the crc check', function(){
			adsb.decodePacket('*20000f1f684a6c;').should.include({crc_ok: false});
			adsb.decodePacket('*280010248c796b;').should.include({crc_ok: false});

			adsb.decodePacket('*00c18c367cbee4;').should.include({crc_ok: false});
			adsb.decodePacket('*20000c37971428;').should.include({crc_ok: false});
			adsb.decodePacket('*00c18c387ceaa5;').should.include({crc_ok: false});
			adsb.decodePacket('*20000c3868b460;').should.include({crc_ok: false});

			adsb.decodePacket('*a00007930000000000000068c268;').should.include({crc_ok: false});
		});
	});
});