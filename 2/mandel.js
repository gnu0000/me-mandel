// Mandel.js
// Craig Fitzgerald
//
$(function() {
   var scene = new Mandel($("#plane"), $("#plane-overlay"));
});


function Mandel(canvas, overlay, options){
   var self = this;

   this.Init = function(canvas, overlay, options){
      self.InitAttributes(canvas, overlay, options);
      self.InitEvents();
      self.InitState ();
   };

   this.InitAttributes = function(canvas, overlay, options){
      self.canvas  = $(canvas).get(0);
      self.overlay = $(overlay).get(0);
      self.ctx     = self.canvas.getContext('2d');
      self.ctxo    = self.overlay.getContext('2d');
      self.range   = {x0: -2.5, x1:1, y0:-1, y1: 1};
      self.options = $.extend({}, options || {});
      self.maxIter = 2000;

      self.selecting = false;
      self.startSel  = {x:0, y:0};
      self.endSel    = {x:0, y:0};

      self.InitColors();
      self.Resize();
   };
   
   this.InitEvents = function(){
      document.oncontextmenu = function(){return false};
      $(window).resize(self.Resize);

      $(window).keydown(self.KeyDown)
               .keyup(self.KeyUp)
               .resize(self.Resize);

      $(self.overlay).mousedown(self.MouseDown)
                     .mouseup(self.MouseUp)
                     .mousemove(self.MouseMove);
   };            

   this.InitState = function(){
      self.Draw();
   };

   this.InitColors = function(){
      self.colorStart = {r:self.Random(255), g:self.Random(255), b:self.Random(255)};
      self.colorDelta = {r:self.Random(15), g:self.Random(15), b:self.Random(15)};
   };

   this.StepToColor = function(step){
      if (step >= self.maxIter) return {r:0,g:0,b:0};

      return {r: (self.colorStart.r + step * self.colorDelta.r) % 256,
              g: (self.colorStart.g + step * self.colorDelta.g) % 256,
              b: (self.colorStart.b + step * self.colorDelta.b) % 256};
   };


   this.Resize = function(){
      var x = $(window).width() ;
      var y = $(window).height();
      $('body').width (x);
      $('body').height(y);
      $(self.canvas).width (x);
      $(self.canvas).height(y);
      self.canvas.width  = x;
      self.canvas.height = y;

      $(self.overlay).width (x);
      $(self.overlay).height(y);
      self.overlay.width  = x;
      self.overlay.height = y;

      self.dx = (self.range.x1 - self.range.x0) /x; 
      self.dy = (self.range.y1 - self.range.y0) /y; 
      self.image = self.ctx.getImageData(0, 0, x, y);
      self.Draw();
   };

   this.sz = function(label,e){
      return label +"("+ e.width() +","+ e.height() +") ";
   }
   
   this.Draw = function(){
      self.DrawLine(0);
   };

   this.DrawLine = function(y){
      for (x=0; x<self.canvas.width; x++){
         self.SetPixel(x,y);
      }
      if (y<self.canvas.height){
         if (!(y % 25)) this.UpdateCanvas();
         setTimeout(function(){self.DrawLine(y+1)},1);
      } else {
         this.UpdateCanvas();
      }
   };

   this.SetPixel = function(x,y){
      var idx   = (x + y * self.canvas.width) * 4;
      var vx    = (self.range.x0 + x * self.dx);
      var vy    = (self.range.y0 + y * self.dy);
      var steps = self.Steps(vx,vy);
      //var color = self.colors[steps] || {r:0, g:0, b:0};

      var color = self.StepToColor(steps);

      self.image.data[idx+0] = color.r;
      self.image.data[idx+1] = color.g
      self.image.data[idx+2] = color.b;
      self.image.data[idx+3] = 255;

   //self.ctx.putImageData(self._id, x, y);
   };

   this.Steps = function (px,py){
      var x=0;
      var y=0;
      var iter=0;
      while (x*x  + y*y < 4 && iter < self.maxIter) {
         var xtmp = x*x-y*y + px;
         var ytmp = 2*x*y + py;

         if (x==xtmp && y==ytmp){
            return self.maxIter;
         }
         y = ytmp;
         x = xtmp;
         iter++;
      }
      return iter;
   }

   this.CanvasToPoint = function(cx,cy){
      var px = (self.range.x0 + cx * self.dx);
      var py = (self.range.y0 + cy * self.dy);

      return {x:px, y:py};
   }

   this.UpdateCanvas = function(){
      self.ctx.putImageData(self.image, 0, 0);
   }

   this.KeyDown = function (event){
      var e = event.originalEvent;
      switch(e.which){
         case 107:return self.ZoomIn();   // +     - bigger cells  / faster
         case 109:return self.ZoomOut();   // -     - smaller cells / slower

//         case 27: return self.TogglePause();        // esc   - toggle pause
//         case 32: return self.ToggleActiveCell();   // space - toggle cell
//         case 16: return self.StartMark();          // shift - start selecting
//         case 17: return self.StartMark();          // ctrl  - start selecting
//         case 37: return self.MoveActiveCell(-1,0); // left  - move selected cell
//         case 38: return self.MoveActiveCell(0,-1); // up    - move selected cell
//         case 39: return self.MoveActiveCell(1,0);  // right - move selected cell
//         case 40: return self.MoveActiveCell(0,1);  // down  - move selected cell
//         case 67: return self.Clear();              // c     - clear
//         case 68: return self.DisableInterface();   // d     - disable interface
//         case 78: return self.Reset();              // n     - new screen
//         case 80: return self.Paste();              // p     - new screen
//         case 107:return self.Rescale(e,1.1);       // +     - bigger cells  / faster
//         case 109:return self.Rescale(e,0.9);       // -     - smaller cells / slower
//         case 73: return $("#help").toggle();       // i
//         case 191:return $("#help").toggle();       // ?
      }
//      if (e.which >= 48 && e.which <= 57 && e.shiftKey){
//         self.StoreBuffer(e.which-48);
//      }
//      if (e.which >= 48 && e.which <= 57 && !e.shiftKey){
//         self.LoadBuffer(e.which-48);
//         self.Paste();
//         self.DrawIfPaused();
//      }
   };

   this.KeyUp = function(event){
      var e = event.originalEvent;
      switch(e.which){
         case 16: return self.EndMark();           // shift - stop selecting
         case 17: return self.EndMark();           // ctrl  - stop selecting
      }
   };

   this.MouseDown = function(event){

      var e = event.originalEvent;
      if (e.buttons == 2) {
         var ps = self.CanvasToPoint(self.startSel.x, self.startSel.y);
         var pe = self.CanvasToPoint(self.endSel.x  , self.endSel.y);
         self.range = {x0: ps.x, x1:pe.x, y0:ps.y, y1: pe.y};
         self.Resize();
         return;
      }

      self.selecting = true;
      self.startSel.x = self.endSel.x = e.x;
      self.startSel.y = self.endSel.y = e.y;
      self.DrawSelection(1);
   };

   this.MouseUp = function(event){
      self.selecting = false;
      self.DrawSelection(1);

   };

   this.MouseMove = function(event){
      var e = event.originalEvent;
      //self.MouseInfo(e);
      if (self.selecting) {
         self.endSel.x = e.x;
         self.endSel.y = e.y;
         self.DrawSelection(1);
      }
   };

   this.DrawSelection = function(){
      var sx = self.startSel.x;
      var sy = self.startSel.y;
      var ex = self.endSel.x  ;
      var ey = self.endSel.y  ;

      self.ctxo.clearRect(0,0,self.overlay.width,self.overlay.height);
//      self.ctxo.beginPath();
//      self.ctxo.lineWidth = 1;
//      self.ctxo.strokeStyle = "#fff";
//      self.ctxo.moveTo(sx,sy);
      self.from(sx,sy).to(ex,sy).to(ex,ey).to(sx,ey).to(sx,sy).end();
//      self.ctxo.stroke();
   };

   this.from = function(x,y){
      self.ctxo.beginPath();
      self.ctxo.lineWidth = 1;
      self.ctxo.strokeStyle = "#fff";
      self.ctxo.moveTo(x,y);
      return self;
   }
   this.to = function(x,y){
      self.ctxo.lineTo(x,y);
      return self;
   }
   this.end = function(){
      self.ctxo.stroke();
   }


   this.MouseInfo = function(e){
      var p = self.CanvasToPoint(e.x,e.y)
      self.DebugInfo("Mouse "+
            "["+e.x+","+e.y+"] "+
            "{"+p.x+","+p.y+"}");
   };


   this.ZoomIn = function(){
      var ps = self.CanvasToPoint(self.startSel.x, self.startSel.y);
      var pe = self.CanvasToPoint(self.endSel.x  , self.endSel.y);
      self.range = {x0: ps.x, x1:pe.x, y0:ps.y, y1: pe.y};
      self.Resize();
   };

   this.ZoomOut = function(){
      rx0 = self.range.x0;
      rx1 = self.range.x1;
      ry0 = self.range.y0;
      ry1 = self.range.y1;

      var ps = self.CanvasToPoint(self.startSel.x, self.startSel.y);
      var pe = self.CanvasToPoint(self.endSel.x  , self.endSel.y);

      var sx0 = ps.x;
      var sy0 = ps.y;
      var sx1 = pe.x;
      var sy1 = pe.y;

      var l1 = sx0 - rx0;
      var l2 = sx1 - sx0;
      var l3 = rx1 - sx1;

      var m1 = sy0 - ry0;
      var m2 = sy1 - sy0;
      var m3 = ry1 - sy1;

      var nx0 = rx0 - (l1/l2) * (rx1 - rx0);
      var ny0 = ry0 - (m1/m2) * (ry1 - ry0);
      var nx1 = rx1 + (l3/l2) * (rx1 - rx0);
      var ny1 = ry1 + (m3/m2) * (ry1 - ry0);
      
      self.range = {x0:nx0, y0:ny0, x1:nx1, y1:ny1};
      self.Resize();
   };

   this.DebugInfo = function(msg){
      $("#debug-info").text(msg);
   };


   this.HSL = function(h, s, l){
      return 'hsl('+h+','+s+','+l+')';
   };

   this.UrlParam = function(name, defaultVal){
      var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
      if(results){
         return decodeURIComponent(results[1]);
      }
      return defaultVal;
   };

   this.Random = function (max){
      return Math.floor(Math.random() * max);
   };

   this.RandomRange = function (min, max){
      return Math.floor(min + Math.random() * (max - min));
   };

   this.Init(canvas, overlay, options);
};
