// Mandel.js - gpu version using gpu.js
// This is unfinished
// 
// a canvas toy
// Craig Fitzgerald
//
$(function() {
   new MandelPage("#plane", "#plane-overlay");
});

class MandelPage {
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

   constructor(canvas, overlay) {
      this.InitAttributes(canvas, overlay);
      this.InitEvents();
      this.InitState ();
   }

   InitAttributes(canvas, overlay) {
      this.canvas;
      this.overlay = $(overlay).get(0);
      this.ctxo    = this.overlay.getContext('2d');
      this.gpu     = new GPU();
      this.AddUrlParams();
   }
   
   InitEvents() {
      document.oncontextmenu = function() {return false};

      $(window)
         .resize (this.HandleResize)
         .keydown(this.HandleKeyDown);

      $(this.overlay)
         .mousedown(this.HandleMouseDown)
         .mouseup  (this.HandleMouseUp)
         .mousemove(this.HandleMouseMove)
         .on("wheel", this.HandleMouseWheel);

      $("#iter").change(this.HandleMaxIter);
      $("#worker-ct").change(this.HandleWorkerCount);
      $("#color-table input").change(this.HandleColorAttr);
      $("#save-image input").keydown(this.HandleSaveName);
      $("#save-image a").click(this.HandleSaveLink);
   }

   InitState() {
      this.InitColors();
      this.GpuPrep();
      this.HandleResize();
   }

   InitColors() {
      this.cdelta = 10; // (256 * 15)/(this.maxSteps - this.minSteps);
      this.colors = {
         r: {start: this.RandomI(255), delta: this.Random(this.cdelta)},
         g: {start: this.RandomI(255), delta: this.Random(this.cdelta)},
         b: {start: this.RandomI(255), delta: this.Random(this.cdelta)}
      }
   }

   HandleResize = () => {
      let x = $(window).width() ;
      let y = $(window).height();
      $('body').width (x);
      $('body').height(y);
      $(this.overlay).width (x);
      $(this.overlay).height(y);
      this.overlay.width  = x;
      this.overlay.height = y;
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
      this.gpuRender(this.range.x0, this.range.x1, this.range.y0, this.range.y1, this.maxIter);
   }

   HandleKeyDown = (event) => {
      let e = event.originalEvent;
      switch(e.which){
         case 32: return this.CenterAtPoint();// <space> - re color
         case 67: return this.Recolor();      // c - re color
         case 68: return this.DebugInfo();    // d - debug info
         case 73: return this.ShowMaxIter();  // i - set max iteration
         case 75: return this.ColorPicker();  // k - color picker
         case 76: return this.SaveLink();     // l - save link
         case 82: return this.Reset();        // r - reset
         case 83: return this.SaveImage();    // s - save
         case 84: return this.GpuTest();      // t - test
         case 87: return this.ShowWorkerCt(); // w - show worker ct
         case 90: return this.SaveImage2();   // z - debug
         case 107:return this.ZoomIn();       // + - bigger cells  / faster
         case 109:return this.ZoomOut();      // - - smaller cells / slower
         case 72: return $("#help").toggle(); // h
         case 191:return $("#help").toggle(); // ?
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
         //this.endSel.y = e.y; <- nope, make it keep the aspect ratio
         this.endSel.y = this.startSel.y + (this.endSel.x - this.startSel.x) * this.aspect;
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
      this.ctxo.strokeStyle = "#fff";
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
//      this.HandleResize();
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
//      this.HandleResize();
      this.Draw();
   }

   ZoomToPoint(pin, scale) {

console.log (`pre zoom: x0:${this.range.x0} x1:${this.range.x1} y0:${this.range.y0} y1:${this.range.y1}`);
console.log (`pin x:${pin.x} y:${pin.y}, scale:${scale}`);

      this.range = this.GetZoomExtents(this.range, pin, scale);

console.log (`post zoom: x0:${this.range.x0} x1:${this.range.x1} y0:${this.range.y0} y1:${this.range.y1}`);

//      this.HandleResize();
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
      //return r + (p - r) * scale;
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

   Recolor() {
      this.InitColors();
//      this.HandleResize();
      this.Draw();
   }

   ColorPicker() {
      $("#color-table .rs").val(this.colors.r.start);
      $("#color-table .gs").val(this.colors.g.start);
      $("#color-table .bs").val(this.colors.b.start);

      $("#color-table .rd").val(this.colors.r.delta);
      $("#color-table .gd").val(this.colors.g.delta);
      $("#color-table .bd").val(this.colors.b.delta);

      $("#colors").toggle();
   }

   HandleColorAttr = () => {
      this.colors = {
         r: {start: $("#color-table .rs").val(), delta: $("#color-table .rd").val()},
         g: {start: $("#color-table .gs").val(), delta: $("#color-table .gd").val()},
         b: {start: $("#color-table .bs").val(), delta: $("#color-table .bd").val()}
      }
      this.Draw();
   }

   Reset() {
      this.range = {x0: -2.5, y0:-1, x1:1, y1: 1};
//      this.HandleResize();
      this.Draw();
   }

   ShowMaxIter() {
      $("#set-iter").toggle();
      $("#iter").val(this.maxIter).focus();
      return false;
   }

   HandleMaxIter = () => {
      this.maxIter = $("#iter").val() - 0;
//      this.HandleResize();
      this.Draw();

      $("#set-iter").hide();
      $(window).trigger("focus");
   }

   ShowWorkerCt() {
      $("#set-workers").toggle();
      $("#worker-ct").val(this.workerCount).focus();
      return false;
   }

   HandleWorkerCount = () => {
      this.workerCount = $("#worker-ct").val() - 0;
      this.SetupWorkers();
//      this.HandleResize();
      this.Draw();
      $(window).trigger("focus");
   }

   // todo: redo
   SaveImage() {
      //console.log("saving image")
      //var image = this.canvas.toDataURL("image/png").replace("image/png","image/octet-stream");
      //window.location.href = image;

      $("#save-image input").val(`Mandel${this.imageIdx}.png`)
      $("#save-image").toggle();
   }
   
   HandleSaveName = (event) => {
      event.originalEvent.stopPropagation();      
   }

   HandleSaveLink = () => {
      let link = $("#save-image a").get(0);
      link.download = $("#save-image input").val();
      link.href = this.canvas.toDataURL("image/png").replace("image/png","image/octet-stream");
      this.imageIdx++;
      $("#save-image").toggle();
   }

   //test
   SaveImage2() {
      $("#save-image input").val(`Mandel${this.imageIdx}.png`)
      $("#save-image").toggle();
      $("#save-image a").trigger("click");
      }

   SaveLink() {
      //let results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
      let base = (window.location.href.match(/^(.*)([\?].*)?$/))[1]
      let url = base + "?" +
               "x0="+this.range.x0+"&"+
               "y0="+this.range.y0+"&"+
               "x1="+this.range.x1+"&"+
               "y1="+this.range.y1+"&"+
               "i="+this.maxIter;
      // let uriContent = "data:application/octet-stream," + encodeURIComponent(url);
      // //newWindow = window.open(uriContent, 'MandelLink');
      let uriContent = "[InternetShortcut]\n" +
                       "URL="+url+"\n";
      let aLink = document.createElement('a');
      let evt = document.createEvent("HTMLEvents");
      evt.initEvent("click");
      aLink.download = "Mandel" + this.imageIdx++ + ".url ";
      aLink.href = uriContent;
      aLink.dispatchEvent(evt);
   }

   DebugInfo(toggle = true) {
      let pt = this.CanvasToPoint(this.mousePos);
      $("#pos-x"      ).text(this.mousePos.x);
      $("#pos-y"      ).text(this.mousePos.y);
      $("#point-x"    ).text(pt.x);
      $("#point-y"    ).text(pt.y);
      $("#max-iter"   ).text(this.maxIter);
      $("#window-x"   ).text($(window).width() );
      $("#window-y"   ).text($(window).height());
      $("#from-x"     ).text(this.range.x0);
      $("#from-y"     ).text(this.range.y0);
      $("#to-x"       ).text(this.range.x1);
      $("#to-y"       ).text(this.range.y1);
      $("#cdelta"     ).text(this.cdelta);
      $("#workers"    ).text(this.workerCount);
      $("#render-time").text(this.renderTime);
      if (toggle) $("#debug-info" ).toggle();
   }

   AddUrlParams() {
      this.maxIter =     this.UrlParam("i" , this.maxIter )-0;
      this.range = {x0 : this.UrlParam("x0", this.range.x0)-0,
                    y0 : this.UrlParam("y0", this.range.y0)-0,
                    x1 : this.UrlParam("x1", this.range.x1)-0,
                    y1 : this.UrlParam("y1", this.range.y1)-0};
   }

   UrlParam(name, defaultVal) {
      let results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
      if(results){
         return decodeURIComponent(results[1]);
      }
      return defaultVal;
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
      return Math.random() * max;
   }

   RandomI(max) {
      return Math.floor(Math.random() * max);
   }

   GpuPrep() {
      let x = $(window).width() ;
      let y = $(window).height();

      this.gpuRender = this.gpu.createKernel(function(xMin, xMax, yMax, yMin, maxIter) {
         let px = xMin + (xMax - xMin) * this.thread.x / this.constants.width;
         let py = yMin + (yMax - yMin) * this.thread.y / this.constants.height;

         let x=0, y=0, xx = 0, yy = 0, iter=0;
         while (xx + yy < 4 && iter < maxIter) {
            let xtmp = xx-yy + px;
            let ytmp = 2*x*y + py;
            if (x==xtmp && y==ytmp) {
               iter = maxIter;
               break;
            };
            y = ytmp;
            x = xtmp;
            xx = x * x;
            yy = y * y;
            iter++;
         }
         if (iter >= maxIter){
            this.color(0, 0, 0, 1);
         } else {
            let r = (this.constants.rStart + this.constants.rDelta * iter) % 256;
            let g = (this.constants.gStart + this.constants.gDelta * iter) % 256;
            let b = (this.constants.bStart + this.constants.bDelta * iter) % 256;
            this.color(r/256, g/256, b/256, 1);
         }
      },{
	      output:[x, y],
	      graphical:true,
         loopMaxIterations: 10000,
         constants: {
            width:   x,
            height:  y,
            rStart:  this.colors.r.start,   // this.RandomI(255),
            gStart:  this.colors.g.start,   // this.RandomI(255),
            bStart:  this.colors.b.start,   // this.RandomI(255),
            rDelta:  this.colors.r.delta,   // this.Random(this.cdelta),
            gDelta:  this.colors.g.delta,   // this.Random(this.cdelta),
            bDelta:  this.colors.b.delta,   // this.Random(this.cdelta)
         }
      });
      this.canvas = this.gpuRender.getCanvas();
      $("#plane").replaceWith(this.canvas);
   }

   GpuTest() {
      console.log(`canvas: w:${this.canvas.width}, h:${this.canvas.height}`);
      console.log(`overlay: w:${this.overlay.width}, h:${this.overlay.height}`);
   }
}


////////////////////////////////////////

