// Mandel.js
// Craig Fitzgerald
//
$(function() {
   var scene = new Mandel($("#plane"));
});


function Mandel(canvas, options){
   var self = this;

   this.Init = function(canvas, options){
      self.InitAttributes(canvas, options);
      self.InitEvents();
      self.InitState ();
   };

   this.InitAttributes = function(canvas, options){
      self.canvas  = $(canvas).get(0);
      self.ctx     = self.canvas.getContext('2d');
      self.range   = {x0: -2.5, x1:1, y0:-1, y1: 1};
      self.options = $.extend({}, options || {});
      self.maxIter = 2000;

      self.selecting = false;
      self.startSel  = {x:0, y:0};
      self.endSel    = {x:0, y:0};

      //self._id = self.ctx.createImageData(1,1);
      //self._d  = self._id.data;

      self.InitColors();

      self.Resize();
   };
   
   this.InitEvents = function(){
      document.oncontextmenu = function(){return false};
      $(window).resize(self.Resize);

      $(self.canvas).mousedown(self.MouseDown)
                    .mouseup(self.MouseUp)
                    .mousemove(self.MouseMove);
   };            

   this.InitState = function(){
      self.Draw();
   };

   //this.InitColors = function(){
   //   self.colors = [];
   //   for (var i=0; i<self.maxIter; i++) {
   //      self.colors[i] = {r:0, g:0, b:0};
   //   }
   //
   //   //for (var i=0; i<self.maxIter; i++) {
   //   //   self.colors[i] = {r:0, g:i/2, b:(128+i)%256 };
   //   var cc = self.RandomRange(1,5);
   //   var cs = self.RandomRange(0,255);
   //   var cd = cc;
   //   var klr = ['r','g','b'];
   //   for (var k=0; k<3; k++) {
   //      for (var i=0; i<self.maxIter; i++) {
   //         var clr = klr[k];
   //         self.colors[i][clr] = cs;
   //         cs = (cs + cd) % 255;
   //      }
   //   }
   //};

   this.InitColors = function(){
      //var self.dr = self.Random(5);
      //var self.dg = self.Random(5);
      //var self.db = self.Random(5);
      self.colorStart = {r:self.Random(255), g:self.Random(255), b:self.Random(255)};
      self.colorDelta = {r:self.Random(15), g:self.Random(15), b:self.Random(15)};
   };


   this.StepToColor = function(step){
      //return self.colors[step] || {r:0, g:0, b:0};
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
      self.DrawSelection(0);

      //var e = event.originalEvent;
      //self.SetActiveFromMouse(e);
      //self.DrawIfPaused();
   };

   this.MouseMove = function(event){
      var e = event.originalEvent;
//      self.MouseInfo(e);
      if (self.selecting) {
         self.DrawSelection(0);
         self.endSel.x = e.x;
         self.endSel.y = e.y;
         self.DrawSelection(1);
      }
   };

   this.DrawSelection = function(sel){
      var sx = self.startSel.x;
      var sy = self.startSel.y;
      var ex = self.endSel.x  ;
      var ey = self.endSel.y  ;

      self.ctx.beginPath();
      self.ctx.lineWidth = 1;
      self.ctx.strokeStyle = (sel ? "#fff" : "#000");

      self.ctx.moveTo(sx,sy);
      self.ctx.lineTo(ex,sy);
      self.ctx.lineTo(ex,ey);
      self.ctx.lineTo(sx,ey);
      self.ctx.lineTo(sx,sy);

      self.ctx.stroke();
   };


   this.MouseInfo = function(e){
      var p = self.CanvasToPoint(e.x,e.y)
      self.DebugInfo("Mouse "+
            "["+e.x+","+e.y+"] "+
            "{"+p.x+","+p.y+"}");
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

   this.Init(canvas, options);
};
