//
// Tests that we can decode valid packets
//

var adsb = require('../lib/adsb.js'),
	assert = require('assert'),
	should = require('should');

describe('packets', function(){
	describe('that are short', function(){
		it('should have the proper type', function(){
			adsb.decodePacket('*02e60eb9be4118;').should.include({type: 0});

			adsb.decodePacket('*20000f1f684a6c;').should.include({type: 4});

			adsb.decodePacket('*280010248c796b;').should.include({type: 5});

			adsb.decodePacket('*5d4d20237a55a6;').should.include({type: 11});
		});

		it('should have the correct number of bits', function(){
			adsb.decodePacket('*02e60eb9be4118;').should.include({bits: 56});
			adsb.decodePacket('*20000f1f684a6c;').should.include({bits: 56});
			adsb.decodePacket('*280010248c796b;').should.include({bits: 56});
			adsb.decodePacket('*5d4d20237a55a6;').should.include({bits: 56});
		});

		it('should have the correct responder capabilities', function(){
			// Need more samples in the wild for the CAs
			adsb.decodePacket('*5d4d20237a55a6;').should.include({ca: 5});
			adsb.decodePacket('*5f4d20232daf00;').should.include({ca: 7});
		});


		it('should have the correct ICAO code', function(){
			// Commented out tests are all failing due to bad CRC and us not currently recovering from that. Good!

			adsb.decodePacket('*5d4d20237a55a6;').should.include({icao: [0x4d, 0x20, 0x23]});
			//adsb.decodePacket('*20000f1f684a6c;').should.include({icao: [0x4d, 0x20, 0x23]});
			//adsb.decodePacket('*280010248c796b;').should.include({icao: [0x4d, 0x20, 0x23]});
			adsb.decodePacket('*5d4d20237a55a6;').should.include({icao: [0x4d, 0x20, 0x23]});

			//adsb.decodePacket('*00c18c367cbee4;').should.include({icao: [0xa1, 0xd9, 0x3b]});
			//adsb.decodePacket('*20000c37971428;').should.include({icao: [0xa1, 0xd9, 0x3b]});
			//adsb.decodePacket('*00c18c387ceaa5;').should.include({icao: [0xa1, 0xd9, 0x3b]});
			//adsb.decodePacket('*20000c3868b460;').should.include({icao: [0xa1, 0xd9, 0x3b]});

			adsb.decodePacket('*5da8fd5abb61ee;').should.include({icao: [0xa8, 0xfd, 0x5a]});
		});

		it('should have the correct extended squitter type and subtype', function(){
			// As this is only for extended squitter messages, these values should be zero on all short messages
			adsb.decodePacket('*5d4d20237a55a6;').should.include({metype: 0, mesub: 0});
		});
	});

	describe('that are long', function(){
		it('should have the proper type', function(){
			adsb.decodePacket('*8d4d202399108fabc87414b31cb8;').should.include({type: 17});
			adsb.decodePacket('*8f4d2023587f345e35837e2218b2;').should.include({type: 17});
			adsb.decodePacket('*8d4d2023991094ad487c14fc9e3d;').should.include({type: 17});
			adsb.decodePacket('*8d4d202358792453ef858bae7fc9;').should.include({type: 17});
			adsb.decodePacket('*8f4d20235877d0bc7d99551e27ca;').should.include({type: 17});
			adsb.decodePacket('*8f4d20235877b0bc01996ff7b3f2;').should.include({type: 17});
			adsb.decodePacket('*8f4d2023991093ad087c133060d1;').should.include({type: 17});

			adsb.decodePacket('*a0200eb02004d0f4cb18200ba365;').should.include({type: 20});
			adsb.decodePacket('*a0200eb0000000000000003fc97c;').should.include({type: 20});

			adsb.decodePacket('*a8201024fa8103000000004da3bc;').should.include({type: 21});
		});

		it('should have the correct number of bits', function(){
			adsb.decodePacket('*8d4d202399108fabc87414b31cb8;').should.include({bits: 112});
			adsb.decodePacket('*a0200eb02004d0f4cb18200ba365;').should.include({bits: 112});
			adsb.decodePacket('*a8201024fa8103000000004da3bc;').should.include({bits: 112});
		});

		it('should have the correct responder capabilities', function(){
			// Need more samples in the wild for the CAs
			adsb.decodePacket('*8d4d2023991094ad487c14fc9e3d;').should.include({ca: 5});
			adsb.decodePacket('*8f4d2023587f345e35837e2218b2;').should.include({ca: 7});
		});

		it('should have the correct ICAO code', function(){
			// Commented out tests are all failing due to bad CRC and us not currently recovering from that. Good!
			
			adsb.decodePacket('*8f4d2023587f345e35837e2218b2;').should.include({icao: [0x4d, 0x20, 0x23]});
			adsb.decodePacket('*8d4d2023991094ad487c14fc9e3d;').should.include({icao: [0x4d, 0x20, 0x23]});
			adsb.decodePacket('*8d4d202358792453ef858bae7fc9;').should.include({icao: [0x4d, 0x20, 0x23]});
			adsb.decodePacket('*8f4d20235877d0bc7d99551e27ca;').should.include({icao: [0x4d, 0x20, 0x23]});

			//adsb.decodePacket('*a00007930000000000000068c268;').should.include({icao: [0xa8, 0xfd, 0x5a]});

			adsb.decodePacket('*8fa86e855817a4a338c396d4f13f;').should.include({icao: [0xa8, 0x6e, 0x85]});
			adsb.decodePacket('*8fa86e859910fd87e0a0065eb299;').should.include({icao: [0xa8, 0x6e, 0x85]});
			adsb.decodePacket('*8fa86e855819210de2163f721386;').should.include({icao: [0xa8, 0x6e, 0x85]});
		});

		it('should have the correct extended squitter type and subtype', function(){
			// Not a whole lot of coverage on all the different possible values here
			adsb.decodePacket('*8f4d20232004d0f4cb1820000d24;').should.include({metype: 4, mesub: 0});
			adsb.decodePacket('*8d4d20232004d0f4cb1820b0efd4;').should.include({metype: 4, mesub: 0});

			adsb.decodePacket('*8f4d2023587f345e35837e2218b2;').should.include({metype: 11, mesub: 0});
			adsb.decodePacket('*8f4d20235877d0bc7d99551e27ca;').should.include({metype: 11, mesub: 0});

			adsb.decodePacket('*8d4d2023991094ad487c14fc9e3d;').should.include({metype: 19, mesub: 1});
			adsb.decodePacket('*8f4d2023991093acc87c1484b159;').should.include({metype: 19, mesub: 1});
		});
	});
});