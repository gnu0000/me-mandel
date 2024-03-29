"use strict";

// Mandel.js
// 
// a canvas toy
// Craig Fitzgerald
//
// Saved images can be drag/dropped onto this page to continue editing
// 
// http://gn00ltnd8rs6ph2/toys/mandel/mandel.html?i=5000&x0=-1.224240592914189&y0=-0.13112358169928026&x1=-1.2242393197229833&y1=-0.13112285416144834&r=197&g=23&b=208&rd=1.024&gd=2.14&bd=3.062
// http://gn00ltnd8rs6ph2/toys/mandel/mandel.html?i=5000&x0=-0.9974149939088077&y0=-0.28745231377667163&x1=-0.9974149936972826&y1=-0.2874523136558001&r=1&g=109&b=208&rd=0.449&gd=1.1609&bd=0.3352
// http://gn00ltnd8rs6ph2/toys/mandel/mandel.html?i=5000&x0=-1.2242399925349&y0=-0.13112323809286083&x1=-1.2242399268802495&y1=-0.13112320057591773&r=197&g=23&b=208&rd=1.024&gd=2.14&bd=3.062
// http://gn00ltnd8rs6ph2/toys/mandel/mandel.html?i=500&x0=-0.9974147551123084&y0=-0.28745249157767716&x1=-0.9974142757661713&y1=-0.2874522176655988&r=1&g=109&b=208&rd=3.357&gd=8.87&bd=7.562// 
// http://gn00ltnd8rs6ph2/toys/mandel/mandel.html?i=500&x0=-0.7490424268348466&y0=-0.10138705912859394&x1=-0.745180406209397&y1=-0.09918019019976565&r=64&g=101&b=183&rd=1.155&gd=2.712&bd=2.736
// http://gn00ltnd8rs6ph2/toys/mandel/mandel.html?i=2000&x0=-1.324537048165773&y0=-0.11084059575241267&x1=-1.3244185574612568&y1=-0.11077288677840344&h=0.408&hd=0.007
// http://gn00ltnd8rs6ph2/toys/mandel/mandel.html?i=5000&x0=-1.3244585164555798&y0=-0.11083181825122136&x1=-1.3244584830263892&y1=-0.11083179914882679&r=99&g=50&b=58&rd=6.331&gd=4.037&bd=1.24

import PngMeta from './pngMetadata.js'

class MandelPage {
   version     = "1.1.0";
   range       = {x0: -2.5, y0:-1, x1:1, y1: 1};
   maxIter     = 500;
   selecting   = false;
   startSel    = {x:0, y:0};
   endSel      = {x:0, y:0};
   mousePos    = {x:0, y:0};
   imageIdx    = 0; 
   workers     = [];
   workerCount = 8;
   nextRow     = 0;
   zoomFactor  = 1.75;
   colorMethod = 0;

   constructor(canvas, overlay) {
      this.InitAttributes(canvas, overlay);
      this.InitEvents();
      this.InitState ();
   }

   InitAttributes(canvas, overlay) {
      this.canvas  = $(canvas).get(0);
      this.overlay = $(overlay).get(0);
      this.ctx     = this.canvas.getContext('2d');
      this.ctxo    = this.overlay.getContext('2d');

      this.InitColors();
      this.AddUrlParams();
   }
   
   InitEvents() {
      document.oncontextmenu = function() {return false};

      $(window)
         .resize ((e)=>this.HandleResize(e))
         .keydown((e)=>this.HandleKeyDown(e));

      $(this.overlay)
         .mousedown(     (e)=>this.HandleMouseDown(e))
         .mouseup  (     (e)=>this.HandleMouseUp(e))
         .mousemove(     (e)=>this.HandleMouseMove(e))
         .on('wheel'   , (e)=>this.HandleMouseWheel(e))
         .on("dragover", (e)=>this.HandleDragover(e))
         .on("drop"    , (e)=>this.HandleDrop(e));

      $('#iter'             ).change( (e)=>this.HandleMaxIter(e));
      $('#worker-ct'        ).change( (e)=>this.HandleWorkerCount(e));
      $('#color-table input').change( (e)=>this.HandleColorAttr(e));
      $('#save-image input' ).keydown((e)=>this.HandleSaveName(e));
      $('#save-image a'     ).click(  (e)=>this.HandleSaveLink(e));
      $("#help"             ).on("click touchstart", function() {$(this).hide()});
   }

   InitState() {
      if (this.UrlParam('nh')) $("#help").hide();
      this.SetupWorkers();
      this.HandleResize();
   }

   InitColors() {
      if (this.colorMethod) {
         this.colors = { // for hsl based coloring
            h:  this.Random(1),
            hd: this.Random(0.01) + 0.005,
         }
      } else {
         let cdelta = 10; // (256 * 15)/(this.maxSteps - this.minSteps);
         this.colors = { // for rgb based coloring
            r: this.RandomI(255), rd: this.Random(cdelta),
            g: this.RandomI(255), gd: this.Random(cdelta),
            b: this.RandomI(255), bd: this.Random(cdelta),
         }
      }
   }

   HandleResize = () => {
      let x = $(window).width() ;
      let y = $(window).height();
      $('body').width (x);
      $('body').height(y);
      $(this.canvas).width (x);
      $(this.canvas).height(y);
      $(this.overlay).width (x);
      $(this.overlay).height(y);
      this.overlay.width  = this.canvas.width  = x;
      this.overlay.height = this.canvas.height = y;
      this.image = this.ctx.createImageData(x, 1);
      this.grid = {x, y};
      this.Draw();
   }

   CanvasToPoint(pt) {
      let r = this.range;
      return {
         x : r.x0 + (r.x1 - r.x0) * (pt.x / this.grid.x),
         y : r.y0 + (r.y1 - r.y0) * (pt.y / this.grid.y)
      };
   }

   Draw() {
      this.ctxo.clearRect(0,0,this.overlay.width,this.overlay.height);

      this.startTime = Date.now();
      this.iter = {min: 99999, max: 0};
      this.NextInterlace(this.canvas.height);
      this.StartWorkers();
      this.GenerateUrl();
   }

   SetupWorkers() {
      for (let i = 0; i < this.workers.length; i++) {
         this.workers[i].terminate();
         delete this.workers[i];
      }
      this.workers = [];

      for (let i = 0; i < this.workerCount; i++) {
         let worker = new Worker('worker.js');
         worker.workerId = i;
         worker.onmessage = this.HandleWorkerMessage;
         this.workers.push(worker);
      }
   }

   StartWorkers() {
      this.doneCount = 0;
      for (let i = 0; i < this.workers.length; i++) {
         let worker = this.workers[i];
         this.StartWorker(worker, this.NextInterlace());
      }
   }

   StartWorker(worker, nextRow) {
      worker.postMessage({
         workerId: worker.workerId,
         grid    : {x: this.canvas.width, y: this.canvas.height},
         range   : this.range,
         row     : nextRow,
         maxIter : this.maxIter,
         colors  : this.colors,
      });
   }
   
   // todo: worker should return array size
   HandleWorkerMessage = (e) => {
      for (let x=0; x<this.canvas.width * 4; x++) {
         this.image.data[x] = e.data.vals[x];
      }
      this.ctx.putImageData(this.image, 0, e.data.row);

      this.iter.min = Math.min(this.iter.min, e.data.iter.min);
      this.iter.max = Math.max(this.iter.max, e.data.iter.max);

      let nextRow = this.NextInterlace();
      if (nextRow >= 0) {
         this.StartWorker(e.target, nextRow);
      } else {
         this.doneCount++;
         if (this.doneCount == this.workers.length) {
            this.renderTime = (Date.now() - this.startTime)/1000;
            this.DebugInfo(false);
            console.log(`Render time: ${this.renderTime} (${this.workerCount} workers)`);
         }
      }
   }

   HandleKeyDown = (event) => {
      let e = event.originalEvent;
      switch(e.which){
         case 32: return this.CenterAtPoint();// <space> - center at cursor
         case 67: return this.Recolor(e);     // c - re color
         case 68: return this.DebugInfo();    // d - debug info
         case 73: return this.ShowMaxIter();  // i - set max iteration
         case 75: return this.ColorPicker();  // k - color picker
         case 76: return this.SaveLink();     // l - save link
         case 82: return this.Reset();        // r - reset
         case 83: return this.SaveImage();    // s - save
         case 87: return this.ShowWorkerCt(); // w - show worker ct
         case 90: return this.SaveImage2();   // z - debug
         case 107:return this.ZoomIn();       // + - bigger cells  / faster
         case 109:return this.ZoomOut();      // - - smaller cells / slower
         case 72: return $('#help').toggle(); // h
         case 191:return $('#help').toggle(); // ?
      }
   }

   // todo: new sel var
   HandleMouseDown = (event) => {
      let e = event.originalEvent;
      this.aspect     = this.grid.y / this.grid.x;
      this.selecting  = true;
      this.startSel.x = this.endSel.x = e.x;
      this.startSel.y = this.endSel.y = e.y;
      this.DrawSelection(1);
   }

   HandleMouseUp = (event) => {
      this.selecting = false;
      this.DrawSelection();
   }

   HandleMouseMove = (event) => {
      let e = event.originalEvent;
      this.mousePos.x = e.x;
      this.mousePos.y = e.y;

      if (this.selecting) {
         this.endSel.x = e.x;
         if (e.shiftKey) {
            this.endSel.y = e.y;
         } else {
            this.endSel.y = this.startSel.y + (this.endSel.x - this.startSel.x) * this.aspect;
         }
         this.DrawSelection();
      }
   }

   HandleMouseWheel = (event) => {
      let e = event.originalEvent;

      let scale = e.deltaY > 0 ? this.zoomFactor : 1/this.zoomFactor;
      let pin = this.CanvasToPoint(this.mousePos);
      this.ZoomToPoint(pin, scale);
   }

   DrawSelection() {
      let sx = this.startSel.x;
      let sy = this.startSel.y;
      let ex = this.endSel.x  ;
      let ey = this.endSel.y  ;

      this.ctxo.clearRect(0,0,this.overlay.width,this.overlay.height);
      this.from(sx,sy).to(ex,sy).to(ex,ey).to(sx,ey).to(sx,sy).end();
   }

   from(x,y) {
      this.ctxo.beginPath();
      this.ctxo.lineWidth = 1;
      this.ctxo.strokeStyle = '#fff';
      this.ctxo.moveTo(x,y);
      return this;
   }

   to(x,y) {
      this.ctxo.lineTo(x,y);
      return this;
   }

   end() {
      this.ctxo.stroke();
   }

   ZoomIn() {
      let ps = this.CanvasToPoint(this.startSel);
      let pe = this.CanvasToPoint(this.endSel);
      this.range = {x0: ps.x, x1:pe.x, y0:ps.y, y1: pe.y};
      this.Draw();
   }

   // todo var to let
   ZoomOut() {
      let r   = this.range;
      let ps  = this.CanvasToPoint(this.startSel);
      let pe  = this.CanvasToPoint(this.endSel);
      let nx0 = r.x0 - (ps.x - r.x0) / (pe.x - ps.x) * (r.x1 - r.x0);
      let ny0 = r.y0 - (ps.y - r.y0) / (pe.y - ps.y) * (r.y1 - r.y0);
      let nx1 = r.x1 + (r.x1 - pe.x) / (pe.x - ps.x) * (r.x1 - r.x0);
      let ny1 = r.y1 + (r.y1 - pe.y) / (pe.y - ps.y) * (r.y1 - r.y0);
      
      this.range = {x0:nx0, y0:ny0, x1:nx1, y1:ny1};
      this.Draw();

   }

   ZoomToPoint(pin, scale) {
      this.range = this.GetZoomExtents(this.range, pin, scale);
      this.Draw();

   }

   GetZoomExtents(range, pin, scale) {
      return {
         x0: this.rng(range.x0, pin.x, scale),
         x1: this.rng(range.x1, pin.x, scale),
         y0: this.rng(range.y0, pin.y, scale),
         y1: this.rng(range.y1, pin.y, scale)
      }
   }

   rng(r, p, scale) {
      return p - (p - r) * scale;
   }

    CenterAtPoint() {
      let pin = this.CanvasToPoint(this.mousePos);
      
      let dx = pin.x - (this.range.x0 + this.range.x1)/  2;
      let dy = pin.y - (this.range.y0 + this.range.y1)/2;
      this.range.x0 += dx;
      this.range.x1 += dx;
      this.range.y0 += dy;
      this.range.y1 += dy;
      this.Draw();
   }

   Recolor(e) {
      this.colorMethod = !!e.shiftKey;
      this.InitColors();
      this.Draw();
   }

   ColorPicker() {
      $('#color-table .rs').val(this.colors.r);
      $('#color-table .gs').val(this.colors.g);
      $('#color-table .bs').val(this.colors.b);

      $('#color-table .rd').val(this.colors.rd);
      $('#color-table .gd').val(this.colors.gd);
      $('#color-table .bd').val(this.colors.bd);

      $('#colors').toggle();
   }

   HandleColorAttr = () => {
      this.colors = {
         r: $('#color-table .rs').val(), rd: $('#color-table .rd').val(),
         g: $('#color-table .gs').val(), gd: $('#color-table .gd').val(),
         b: $('#color-table .bs').val(), bd: $('#color-table .bd').val()
      }
      this.colorMethod = 0;
      this.Draw();
   }

   Reset() {
      history.replaceState(null, '', document.location.origin + document.location.pathname);
      this.range = {x0: -2.5, y0:-1, x1:1, y1: 1};
      this.HandleResize();
   }

   ShowMaxIter() {
      $('#set-iter').toggle();
      $('#iter').val(this.maxIter).focus();
      return false;
   }

   HandleMaxIter = () => {
      this.maxIter = $('#iter').val() - 0;
      this.Draw();
      $('#set-iter').hide();
   }

   ShowWorkerCt() {
      $('#set-workers').toggle();
      $('#worker-ct').val(this.workerCount).focus();
      return false;
   }

   HandleWorkerCount = () => {
      this.workerCount = $('#worker-ct').val() - 0;
      this.SetupWorkers();
      this.Draw();

      $('#set-workers').hide();
   }

   async SaveImage() {
      console.log("in saveimage");

      let link = document.createElement('a');
      link.setAttribute("download", "mandel.png");
      this.canvas.toBlob(async (blob) => {
         let metadata = {
            "tEXt": {
               "Title": "A mandelbrot image",
               "Software": `Mandel v${this.version}`,
               "Params": JSON.stringify(this.GetState())
            }
         };
         var newBlob = await PngMeta.writeMetadataB(blob,metadata);
         let url = URL.createObjectURL(newBlob);
         link.setAttribute('href', url);
         link.click();
      });
   }

   HandleDragover(e) {
      e.preventDefault();
   }

   HandleDrop(e) {
      console.log("in handledrop");

      e.preventDefault();
      let file = e.originalEvent.dataTransfer.files[0];
      if (!file.type.match(/\image\/png/i)) return;

      var reader = new FileReader();
      reader.onload = (e) => {   
         let buffer = new Uint8Array(e.target.result);
         let metadata = PngMeta.readMetadata(buffer);

         if (!metadata.tEXt || !metadata.tEXt.Params) return;
         console.log("png metadata:", metadata);
         let params = JSON.parse(metadata.tEXt.Params);
         this.SetState(params);
         this.Draw();

      };
      reader.readAsArrayBuffer(file); // remove?
   }

   GetState() {
      return {
         range:   this.range,
         maxIter: this.maxIter,
         colors:  this.colors,
      }
   }

   SetState(state) {
      Object.assign(this, state);
   }

   DebugInfo(toggle = true) {
      let pt = this.CanvasToPoint(this.mousePos);
      $('#pos-x'      ).text(this.mousePos.x);
      $('#pos-y'      ).text(this.mousePos.y);
      $('#point-x'    ).text(pt.x);
      $('#point-y'    ).text(pt.y);
      $('#max-iter'   ).text(this.maxIter);
      $('#iter-min'   ).text(this.iter.min);
      $('#iter-max'   ).text(this.iter.max);
      $('#window-x'   ).text($(window).width() );
      $('#window-y'   ).text($(window).height());
      $('#from-x'     ).text(this.range.x0);
      $('#from-y'     ).text(this.range.y0);
      $('#to-x'       ).text(this.range.x1);
      $('#to-y'       ).text(this.range.y1);
      $('#workers'    ).text(this.workerCount);
      $('#render-time').text(this.renderTime);
      if (toggle) $('#debug-info' ).toggle();
   }

   AddUrlParams() {
      this.maxIter = this.UrlParam('i' , this.maxIter )-0;
      let [r, c] = [this.range, ]

      for (let p of ['x0','y0','x1','y1']) {
         this.range[p] = this.UrlParam(p, this.range[p])-0;
      }
      for (let p of ['r','g','b','rd','gd','bd','h','hd']) {
         this.colors[p] = this.UrlParam(p, this.colors[p] || 0)-0;
      }
      this.colorMethod = !!this.colors.hd;
   }

   UrlParam(name, defaultVal) {
      let results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
      if(results){
         return decodeURIComponent(results[1]);
      }
      return defaultVal;
   }

   GenerateUrl = () => {
      let s = self.state;
      let url = new URL(document.location.pathname, document.location.origin);

      this.range.i = this.maxIter;
      ['i','x0','y0','x1','y1'].map(p => url.searchParams.set(p, this.range[p]));

      let params = this.colorMethod ? ['h','hd'] : ['r','g','b','rd','gd','bd'];
      params.map(p => url.searchParams.set(p, this.colors[p]));

      history.replaceState(null, '', url);
   }

   NextInterlace = (num = 0) => {
      if (num) {
         this.interIndex = 0;
         this.interCount = num;
         this.interBits = Math.floor(Math.log2(num)) + 1;
         this.interMax = 2**this.interBits;
         return;
      }
      while(this.interIndex < this.interMax) {
         let rev = this.ReverseBits(this.interBits, this.interIndex);
         this.interIndex++;
         if (rev < this.interCount) return rev;
      }
      return -1;
   }

   ReverseBits(count, bits) {
      let result = 0;
      for (let i=0; i<count; i++) {
         result = result * 2 + bits % 2;
         bits = Math.floor(bits/2);
      }
      return result;      
   }

   DumpRange(message, r) {
      console.log(`${message}: x0:${r.x0} x1:${r.x1} y0:${r.y0} y1:${r.y1}`);
   }

   Random(max) {
      return Math.floor(Math.random() * max * 1000) / 1000;
   }

   RandomI(max) {
      return Math.floor(Math.random() * max);
   }
}


$(function() {
   new MandelPage('#plane', '#plane-overlay');
});

