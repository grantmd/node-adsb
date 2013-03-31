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
	});
});