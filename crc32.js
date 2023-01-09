"use strict";

// crc32.js
//
// This module exports the static class CRC32 which is an API to generate
// crc32 values
//
// This class is derived from code at https://github.com/hometlt/png-metadata
// by Denis Ponomarev. which comes from:
//    crc32.js (C) 2014-present SheetJS -- http://sheetjs.com
// 
// I basically turned it into a javascript module with a static class
//
// Craig Fitzgerald 2023

export default class CRC32 {
	version = '1.2.0';

	static table() {
		var c = 0, table = new Array(256);
		for(var n =0; n != 256; ++n){
			c = n;
			c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
			c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
			c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
			c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
			c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
			c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
			c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
			c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
			table[n] = c;
		}
		return typeof Int32Array !== 'undefined' ? new Int32Array(table) : table;
   }

	static bstr(bstr, seed) {
	   var T = CRC32.table();
		var C = seed ^ -1, L = bstr.length - 1;
		for(var i = 0; i < L;) {
			C = (C>>>8) ^ T[(C^bstr.charCodeAt(i++))&0xFF];
			C = (C>>>8) ^ T[(C^bstr.charCodeAt(i++))&0xFF];
		}
		if(i === L) C = (C>>>8) ^ T[(C ^ bstr.charCodeAt(i))&0xFF];
		return C ^ -1;
   }

	static buf(buf, seed) {
	   var T = CRC32.table();
		if(buf.length > 10000) return CRC32.buf_8(buf, seed);
		var C = seed ^ -1, L = buf.length - 3;
		for(var i = 0; i < L;) {
			C = (C>>>8) ^ T[(C^buf[i++])&0xFF];
			C = (C>>>8) ^ T[(C^buf[i++])&0xFF];
			C = (C>>>8) ^ T[(C^buf[i++])&0xFF];
			C = (C>>>8) ^ T[(C^buf[i++])&0xFF];
		}
		while(i < L+3) C = (C>>>8) ^ T[(C^buf[i++])&0xFF];
		return C ^ -1;
   }

	static buf_8(buf, seed) {
	   var T = CRC32.table();
		var C = seed ^ -1, L = buf.length - 7;
		for(var i = 0; i < L;) {
			C = (C>>>8) ^ T[(C^buf[i++])&0xFF];
			C = (C>>>8) ^ T[(C^buf[i++])&0xFF];
			C = (C>>>8) ^ T[(C^buf[i++])&0xFF];
			C = (C>>>8) ^ T[(C^buf[i++])&0xFF];
			C = (C>>>8) ^ T[(C^buf[i++])&0xFF];
			C = (C>>>8) ^ T[(C^buf[i++])&0xFF];
			C = (C>>>8) ^ T[(C^buf[i++])&0xFF];
			C = (C>>>8) ^ T[(C^buf[i++])&0xFF];
		}
		while(i < L+7) C = (C>>>8) ^ T[(C^buf[i++])&0xFF];
		return C ^ -1;
	}

	static str(str, seed) {
	   var T = CRC32.table();
		var C = seed ^ -1;
		for(var i = 0, L=str.length, c, d; i < L;) {
			c = str.charCodeAt(i++);
			if(c < 0x80) {
				C = (C>>>8) ^ T[(C ^ c)&0xFF];
			} else if(c < 0x800) {
				C = (C>>>8) ^ T[(C ^ (192|((c>>6)&31)))&0xFF];
				C = (C>>>8) ^ T[(C ^ (128|(c&63)))&0xFF];
			} else if(c >= 0xD800 && c < 0xE000) {
				c = (c&1023)+64; d = str.charCodeAt(i++)&1023;
				C = (C>>>8) ^ T[(C ^ (240|((c>>8)&7)))&0xFF];
				C = (C>>>8) ^ T[(C ^ (128|((c>>2)&63)))&0xFF];
				C = (C>>>8) ^ T[(C ^ (128|((d>>6)&15)|((c&3)<<4)))&0xFF];
				C = (C>>>8) ^ T[(C ^ (128|(d&63)))&0xFF];
			} else {
				C = (C>>>8) ^ T[(C ^ (224|((c>>12)&15)))&0xFF];
				C = (C>>>8) ^ T[(C ^ (128|((c>>6)&63)))&0xFF];
				C = (C>>>8) ^ T[(C ^ (128|(c&63)))&0xFF];
			}
		}
		return C ^ -1;
	}
}
