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
//          r: 128, rd: 5.0,
//          g:  64, gd: 6.0,
//          b: 200, bd: 2.0
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

   CalcPixel_orig(gridx, gridy) {
      let nfo = this.nfo;
      let px = nfo.range.x0 + nfo.delta.dx * gridx;
      let py = nfo.range.y0 + nfo.delta.dy * gridy;
      let x=0, y=0, iter=0;
      let xx = x * x;
      let yy = y * y;
      while (xx + yy < 4 && iter < nfo.maxIter) {
         let xtmp = xx-yy + px;
         let ytmp = 2*x*y + py;
         if (x==xtmp && y==ytmp) return nfo.maxIter;
         y = ytmp;
         x = xtmp;
         xx = x * x;
         yy = y * y;
         iter++;
      }
      nfo.iter.min = Math.min(nfo.iter.min, iter);
      nfo.iter.max = Math.max(nfo.iter.max, iter);
      return iter;
   }

   CalcPixel(gridx, gridy) {
      let nfo = this.nfo;
      let x0 = nfo.range.x0 + nfo.delta.dx * gridx;
      let y0 = nfo.range.y0 + nfo.delta.dy * gridy;
      let x=0, y=0, iter=0, max_iter=nfo.maxIter, bail = 1 << 16, xtemp;

      while (x*x + y*y <= bail && iter < max_iter) {
         xtemp = x*x - y*y + x0;
         y = 2*x*y + y0;
         x = xtemp;
         iter++;
      }

      if (iter < max_iter) {
         let log_zn = Math.log(x*x + y*y) / 2;
         let nu = Math.log(log_zn / Math.LN2) / Math.LN2;
         iter += 1 - nu;
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

   //GetColor(pixelVal) {
   //   if (pixelVal >= this.nfo.maxIter)
   //      return {r:0, g:0, b:0};
   //
   //   let colors = this.nfo.colors;
   //   return {
   //      r: (colors.r + pixelVal * colors.rd) % 256,
   //      g: (colors.g + pixelVal * colors.gd) % 256,
   //      b: (colors.b + pixelVal * colors.bd) % 256
   //   }
   //}

   GetColor(pixelVal) {
      if (pixelVal >= this.nfo.maxIter)
         return {r:0, g:0, b:0};

      //let cDelta = Math.sqrt(pixelVal) ** 1.3 * 2;
      //if (Math.random() < 0.001) console.log(`pv: ${pixelVal},  cd: ${cDelta}`);
      let cDelta = pixelVal;


      let colors = this.nfo.colors;
      return {
         r: (colors.r + cDelta * colors.rd) % 256,
         g: (colors.g + cDelta * colors.gd) % 256,
         b: (colors.b + cDelta * colors.bd) % 256
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