// Mandel.js
// 
// a canvas toy
// Craig Fitzgerald
//
$(function() {
   var scene = new Mandel("#plane", "#plane-overlay");
});

function Mandel(canvas, overlay, options){
   var self = this;

   this.Init = function(canvas, overlay, options){
      self.InitAttributes(canvas, overlay, options);
      self.InitEvents();
      self.InitState ();
   };

   this.InitAttributes = function(canvas, overlay, options){
      self.canvas    = $(canvas).get(0);
      self.overlay   = $(overlay).get(0);
      self.ctx       = self.canvas.getContext('2d');
      self.ctxo      = self.overlay.getContext('2d');
      self.range     = {x0: -2.5, y0:-1, x1:1, y1: 1};
      self.options   = $.extend({}, options || {});
      self.maxIter   = 500;
      self.minSteps  = 0;
      self.maxSteps  = 500;
      self.selecting = false;
      self.startSel  = {x:0, y:0};
      self.endSel    = {x:0, y:0};
      self.mousePos  = {x:0, y:0};
      self.imageIdx  = 0; 

      self.AddUrlParams();
      self.InitColors();
   };
   
   this.InitEvents = function(){
      document.oncontextmenu = function(){return false};

      $(window)
         .resize (self.Resize)
         .keydown(self.KeyDown);

      $(self.overlay)
         .mousedown(self.MouseDown)
         .mouseup  (self.MouseUp)
         .mousemove(self.MouseMove);

      $("#iter").change(self.SetMaxIter);
      $("#color-table input").change(this.SetColorAttr);

      //$("#btn-download").click(self.SaveImage)
      var button = document.getElementById('btn-download');
         button.addEventListener('click', function (e) {
         var dataURL = self.canvas.toDataURL('image/png');
         button.href = dataURL;
      });

   };

   this.InitState = function(){
      self.Resize();
      //self.Draw();
   };

   this.InitColors = function(){
      //self.cdelta = (256 * 15)/(self.maxSteps - self.minSteps);
      self.cdelta = 10;

      self.colorStart = {r:self.RandomI(255), g:self.RandomI(255), b:self.RandomI(255)};
      self.colorDelta = {r:self.Random(self.cdelta), g:self.Random(self.cdelta), b:self.Random(self.cdelta)};
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
      $(self.overlay).width (x);
      $(self.overlay).height(y);
      self.overlay.width  = self.canvas.width  = x;
      self.overlay.height = self.canvas.height = y;
      self.dx = (self.range.x1 - self.range.x0) / x; 
      self.dy = (self.range.y1 - self.range.y0) / y; 
      self.image = self.ctx.getImageData(0, 0, x, y);
      self.Draw();
   };

   this.Draw = function(){
      self.minSteps = 99999;
      self.maxSteps = 0;
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
      var color = self.StepToColor(steps);

      self.image.data[idx+0] = color.r;
      self.image.data[idx+1] = color.g
      self.image.data[idx+2] = color.b;
      self.image.data[idx+3] = 255;
   };

   this.Steps = function (px,py){
      var x=0;
      var y=0;
      var iter=0;
      while (x*x  + y*y < 4 && iter < self.maxIter) {
         var xtmp = x*x-y*y + px;
         var ytmp = 2*x*y + py;
         if (x==xtmp && y==ytmp) return self.maxIter;
         y = ytmp;
         x = xtmp;
         iter++;
      }
      self.minSteps = Math.min(self.minSteps, iter);
      self.maxSteps = Math.max(self.maxSteps, iter);
      return iter;
   }

   this.CanvasToPoint = function(pt){
      return {x:(self.range.x0 + pt.x * self.dx), 
              y:(self.range.y0 + pt.y * self.dy)};
   }

   this.UpdateCanvas = function(){
      self.ctx.putImageData(self.image, 0, 0);
   }

   this.KeyDown = function (event){
      var e = event.originalEvent;
      switch(e.which){
         case 67: return self.Recolor();      // c - re color
         case 68: return self.DebugInfo();    // d - debug info
         case 73: return self.ShowMaxIter();  // i - set max iteration
         case 75: return self.ColorPicker();  // k - color picker
         case 76: return self.SaveLink();     // l - save link
         case 82: return self.Reset();        // r - reset
         case 83: return self.SaveImage();    // s - save
         case 107:return self.ZoomIn();       // + - bigger cells  / faster
         case 109:return self.ZoomOut();      // - - smaller cells / slower
         case 72: return $("#help").toggle(); // h
         case 191:return $("#help").toggle(); // ?
      }
   };

   this.MouseDown = function(event){
      var e = event.originalEvent;
      self.selecting = true;
      self.startSel.x = self.endSel.x = e.x;
      self.startSel.y = self.endSel.y = e.y;
      self.DrawSelection(1);
   };

   this.MouseUp = function(event){
      self.selecting = false;
      self.DrawSelection();
   };

   this.MouseMove = function(event){
      var e = event.originalEvent;
      self.mousePos.x = e.x;
      self.mousePos.y = e.y;
      if (self.selecting) {
         self.endSel.x = e.x;
         self.endSel.y = e.y;
         self.DrawSelection();
      }
   };

   this.DrawSelection = function(){
      var sx = self.startSel.x;
      var sy = self.startSel.y;
      var ex = self.endSel.x  ;
      var ey = self.endSel.y  ;

      self.ctxo.clearRect(0,0,self.overlay.width,self.overlay.height);
      self.from(sx,sy).to(ex,sy).to(ex,ey).to(sx,ey).to(sx,sy).end();
   };

   this.from = function(x,y){
      self.ctxo.beginPath();
      self.ctxo.lineWidth = 1;
      self.ctxo.strokeStyle = "#fff";
      self.ctxo.moveTo(x,y);
      return self;
   };

   this.to = function(x,y){
      self.ctxo.lineTo(x,y);
      return self;
   };

   this.end = function(){
      self.ctxo.stroke();
   };

   this.ZoomIn = function(){
      var ps = self.CanvasToPoint(self.startSel);
      var pe = self.CanvasToPoint(self.endSel);
      self.range = {x0: ps.x, x1:pe.x, y0:ps.y, y1: pe.y};
      self.Resize();
   };

   this.ZoomOut = function(){
      var r   = self.range;
      var ps  = self.CanvasToPoint(self.startSel);
      var pe  = self.CanvasToPoint(self.endSel);
      var nx0 = r.x0 - (ps.x - r.x0) / (pe.x - ps.x) * (r.x1 - r.x0);
      var ny0 = r.y0 - (ps.y - r.y0) / (pe.y - ps.y) * (r.y1 - r.y0);
      var nx1 = r.x1 + (r.x1 - pe.x) / (pe.x - ps.x) * (r.x1 - r.x0);
      var ny1 = r.y1 + (r.y1 - pe.y) / (pe.y - ps.y) * (r.y1 - r.y0);
      
      self.range = {x0:nx0, y0:ny0, x1:nx1, y1:ny1};
      self.Resize();
   };

   this.Recolor = function(){
      self.InitColors();
      self.Resize();
   };

   this.ColorPicker = function(){
      $("#color-table tr:nth-child(2)").find("input.start").val(self.colorStart.r);
      $("#color-table tr:nth-child(3)").find("input.start").val(self.colorStart.g);
      $("#color-table tr:nth-child(4)").find("input.start").val(self.colorStart.b);

      $("#color-table tr:nth-child(2)").find("input.delta").val(self.colorDelta.r);
      $("#color-table tr:nth-child(3)").find("input.delta").val(self.colorDelta.g);
      $("#color-table tr:nth-child(4)").find("input.delta").val(self.colorDelta.b);

      $("#colors").toggle();
   };

   this.SetColorAttr = function(){
      self.colorStart.r = $("#color-table tr:nth-child(2)").find("input.start").val();
      self.colorStart.g = $("#color-table tr:nth-child(3)").find("input.start").val();
      self.colorStart.b = $("#color-table tr:nth-child(4)").find("input.start").val();
      self.colorDelta.r = $("#color-table tr:nth-child(2)").find("input.delta").val();
      self.colorDelta.g = $("#color-table tr:nth-child(3)").find("input.delta").val();
      self.colorDelta.b = $("#color-table tr:nth-child(4)").find("input.delta").val();
      self.Draw();
   }

   this.Reset = function(){
      self.range = {x0: -2.5, y0:-1, x1:1, y1: 1};
      self.Resize();
   };

   this.ShowMaxIter = function(){
      $("#set-iter").toggle();
      $("#iter").val(self.maxIter).focus();
      return false;
   };

   this.SetMaxIter = function(){
      self.maxIter = $("#iter").val() - 0;
      self.Resize();
      $("#set-iter").hide();
   };

//   this.SaveImage = function(){
//      var image = self.canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
//      //window.location.href = image; // this doesn't allow you to pick a name
//      var aLink = document.createElement('a');
//      var evt = document.createEvent("HTMLEvents");
//      evt.initEvent("click");
//      aLink.download = "Mandel" + self.imageIdx++ + ".png";
//      aLink.href = image;
//      aLink.dispatchEvent(evt);
//   };

   this.SaveImage = function(){
      var image = self.canvas.toDataURL();
   };


   this.SaveLink = function(){
      //var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
      var base = (window.location.href.match(/^(.*)([\?].*)?$/))[1]
      var url = base + "?" +
               "x0="+self.range.x0+"&"+
               "y0="+self.range.y0+"&"+
               "x1="+self.range.x1+"&"+
               "y1="+self.range.y1+"&"+
               "i="+self.maxIter;
//      var uriContent = "data:application/octet-stream," + encodeURIComponent(url);
//      //newWindow = window.open(uriContent, 'MandelLink');
      var uriContent = "[InternetShortcut]\n" +
                       "URL="+url+"\n";
      var aLink = document.createElement('a');
      var evt = document.createEvent("HTMLEvents");
      evt.initEvent("click");
      aLink.download = "Mandel" + self.imageIdx++ + ".url";
      aLink.href = uriContent;
      aLink.dispatchEvent(evt);
   }

   this.DebugInfo = function(msg){
      var pt = self.CanvasToPoint(self.mousePos);
      $("#pos-x"   ).text(self.mousePos.x);
      $("#pos-y"   ).text(self.mousePos.y);
      $("#point-x" ).text(pt.x);
      $("#point-y" ).text(pt.y);
      $("#max-iter").text(self.maxIter);
      $("#iter-min").text(self.minSteps);
      $("#iter-max").text(self.maxSteps);
      $("#window-x").text($(window).width() );
      $("#window-y").text($(window).height());
      $("#from-x"  ).text(self.range.x0);
      $("#from-y"  ).text(self.range.y0);
      $("#to-x"    ).text(self.range.x1);
      $("#to-y"    ).text(self.range.y1);
      $("#cdelta"  ).text(self.cdelta);
      $("#debug-info").toggle();
   };

   this.AddUrlParams = function(){
      self.maxIter =     self.UrlParam("i" , self.maxIter )-0;
      self.range = {x0 : self.UrlParam("x0", self.range.x0)-0,
                    y0 : self.UrlParam("y0", self.range.y0)-0,
                    x1 : self.UrlParam("x1", self.range.x1)-0,
                    y1 : self.UrlParam("y1", self.range.y1)-0};
   }

   this.UrlParam = function(name, defaultVal){
      var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
      if(results){
         return decodeURIComponent(results[1]);
      }
      return defaultVal;
   };

   this.Random = function (max){
      return Math.random() * max;
   };

   this.RandomI = function (max){
      return Math.floor(Math.random() * max);
   };
   this.Init(canvas, overlay, options);
};
