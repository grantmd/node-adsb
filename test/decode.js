//
// Tests that we can decode valid packets
//

var adsb = require('../lib/adsb.js'),
	assert = require('assert'),
	should = require('should');

describe('packets', function(){
	describe('that are short', function(){
		it('should have the proper type', function(){
			adsb.decodePacket('*5d4d20237a55a6;').should.include({type: 11});
		});
	});

	describe('that are long', function(){
		it('should have the proper type', function(){
			adsb.decodePacket('*8d4d202399108fabc87414b31cb8;').should.include({type: 17});
		});
	});
});