# Node ADS-B

This is an [ADS-B](http://en.wikipedia.org/wiki/Automatic_dependent_surveillance-broadcast) decoder in node. When partnered with some source of ADS-B data, it will decode packets and... DO THINGS.

[![Build Status](https://travis-ci.org/grantmd/node-adsb.png)](https://travis-ci.org/grantmd/node-adsb)

## How to use

You will need a signal source. A good source is either [rtl-sdr](http://sdr.osmocom.org/trac/wiki/rtl-sdr) or [dump1090](https://github.com/antirez/dump1090/), if you have the hardware to receive live signals. Otherwise, it will be possible to either listen to an ADS-B aggregator or local files.

Command line args can be discovered with:

    node adsb.js -h

## Credits

Most of this is a direct port of antirez's dump1090: https://github.com/antirez/dump1090/

Why re-implement it? Mostly because I wanted to do more with the data once it was decoded, and I'm much more comfortable doing that with node than in C.