"use strict";
//
// This file implements the MandelWorker class
// This is a web worker which calculates 1 horizontal 
//  scanline of a mandelbrot image
// The resulting array is compatible with a canvas image
//
// The message data passed in:
//    {
//       grid   : {x: 1024, y: 768},              (canvas size)
//       range  : {x0: -2.5, y0:-1, x1:1, y1: 1}, (view range)
//       y      : 123,                            (scanline)
//       maxIter: 500,                            (max iter calc for pixel)
//       colors : {                               (colormap)
//          r: {start: 128, delta: 5.0},
//          g: {start:  64, delta: 6.0},
//          b: {start: 200, delta: 2.0}
//       }
//    }
//
// The message data passed out:
//    {
//       y    : 123,                              (scanline)
//       vals : Int8Array data                    (line data for canvas)
//       iter: {min: 1, max: 500},                (min/max iters for debug)
//    }

class MandelWorker {
   constructor() {
      //console.log('Worker: constructor');
      this.valsSize = 0;
      onmessage = this.HandleMessage;
   }

   HandleMessage = (e) => {
      this.SetNfo(e);
      this.checkArray();

      for (let x=0; x<this.nfo.grid.x; x++) {
         let pixelVal = this.CalcPixel(x, this.nfo.row);
         this.AddPixel(x, pixelVal);
      }

      postMessage({
         row: this.nfo.row, 
         vals: this.vals,
         iter: this.nfo.iter
      });
   }

   CalcPixel(gridx, gridy) {
      let nfo = this.nfo;
      let px = nfo.range.x0 + nfo.delta.dx * gridx;
      let py = nfo.range.y0 + nfo.delta.dy * gridy;

      let x=0, y=0, iter=0;
      while (x*x  + y*y < 4 && iter < nfo.maxIter) {
         let xtmp = x*x-y*y + px;
         let ytmp = 2*x*y + py;
         if (x==xtmp && y==ytmp) return nfo.maxIter;
         y = ytmp;
         x = xtmp;
         iter++;
      }
      nfo.iter.min = Math.min(nfo.iter.min, iter);
      nfo.iter.max = Math.max(nfo.iter.max, iter);

      return iter;
   }

   AddPixel(x, pixelVal) {
      let colors = this.nfo.colors;

      let color = this.GetColor(pixelVal);
      let idx = x * 4;
      this.vals[idx+0] = color.r;
      this.vals[idx+1] = color.g;
      this.vals[idx+2] = color.b;
      this.vals[idx+3] = 255;
   }

   GetColor(pixelVal) {
      if (pixelVal >= this.nfo.maxIter)
         return {r:0, g:0, b:0};

      let colors = this.nfo.colors;
      return {
         r: (colors.r.start + pixelVal * colors.r.delta) % 256,
         g: (colors.g.start + pixelVal * colors.g.delta) % 256,
         b: (colors.b.start + pixelVal * colors.b.delta) % 256
      }
   }

   SetNfo(e) {
      let nfo = e.data;
      nfo.iter = {min: 99999, max: 0};
      nfo.delta = {
         dx: (nfo.range.x1 - nfo.range.x0) / nfo.grid.x,
         dy: (nfo.range.y1 - nfo.range.y0) / nfo.grid.y
      };
      this.nfo = nfo;
   }

   checkArray() {
      let needed = this.nfo.grid.x * 4;
      if (needed > this.valsSize) {
         this.vals = new Uint8Array(needed);
         this.valsSize = needed;
      }
   }
}

new MandelWorker();