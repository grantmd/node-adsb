//
// Tests for stats
//

var adsb = require('../lib/adsb.js'),
	assert = require('assert'),
	should = require('should');

describe('stats', function(){
	beforeEach(function(){
		adsb.resetStats();
	});

	describe('at the start', function(){
		it('should be empty', function(){
			var stats = adsb.getStats();
			stats.should.have.keys(['packets', 'invalid_packets', 'crc_errors']);

			for (var i in stats){
				stats[i].should.equal(0);
			}
		});
	});

	describe('after processing', function(){
		it('should increment packets counter', function(){
			adsb.decodePacket('*8f4d2023587f345e35837e2218b2;');
			adsb.getStats().should.include({packets: 1});
		});

		it('should increment invalid_packets counter', function(){
			adsb.decodePacket('8f4d2023587f345e35837e2218b2;');
			adsb.getStats().should.include({packets: 1});
			adsb.getStats().should.include({invalid_packets: 1});
		});

		it('should increment crc_errors counter', function(){
			adsb.decodePacket('*7f4d2023587f345e35837e2218b2;');
			adsb.getStats().should.include({packets: 1});
			adsb.getStats().should.include({crc_errors: 1});
		});
	});
});