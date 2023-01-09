"use strict";

// blobToArrayBuffer.js
//
// This class is from code at https://github.com/hometlt/png-metadata
// by Denis Ponomarev.
//
// This module does no exports, it is strictly an import-for-effect module
// This module adds a arrayBuffer() method to the Blob class

if(!Blob.prototype.arrayBuffer){
	Blob.prototype.arrayBuffer = function(){
		return new Promise((resolve,reject) => {
			var fileReader = new FileReader();
			fileReader.onload = function (event) {
				var arrayBuffer = event.target.result;
				resolve(arrayBuffer);
			};
			fileReader.readAsArrayBuffer(this);
			fileReader.result; // also accessible this way once the blob has been read
		})
	}
}
