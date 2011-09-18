var Shape = {};

(function () {

   var stage;

   var EggSVG;
   var EggShape;
   var EggWidth;
   var EggHeight;

   var AlligatorSVG;
   var AlligatorShape;
   var AlligatorWidth;
   var AlligatorHeight;

   Shape.demo = function () {
     Shape.init($("#stage"));
     $("#stage > svg").attr("viewBox", "0 0 1600 1200");
     $("#stage > svg").click(onclick);
   };

   Shape.init = function (_stage) {
     _stage.svg({ onLoad: function () { loadShapes(_stage); } });
   };

   Shape.remove = function () {
     $(".shape", stage.root()).remove();
     return false;
   };

   var getNewId = function() {
     var id = 0;
     return function () { return "id" + (++id); };
   } ();

   function loadShapes (_stage) {
     stage = _stage.svg('get');
     var defs = stage.defs();

     AlligatorSVG = stage.svg(defs);
     stage.load("open.svg", { parent: AlligatorSVG, changeSize: true, onLoad: initAlligator });

     EggSVG = stage.svg(defs);
     stage.load("egg.svg", { parent: EggSVG, changeSize: true, onLoad: initEgg });
   }

   function initEgg (wrapper) {
     EggShape = $("#egg", EggSVG)[0];
     EggWidth = parseFloat($(EggSVG).attr("width"));
     EggHeight = parseFloat($(EggSVG).attr("height"));
   }

   function initAlligator (wrapper) {
     AlligatorShape = $("#alligator", AlligatorSVG)[0];
     AlligatorWidth = parseFloat($(AlligatorSVG).attr("width"));
     AlligatorHeight = parseFloat($(AlligatorSVG).attr("height"));
   }

function onclick (event) {
  var x = (event.pageX - this.offsetLeft) * 4;
  var y = (event.pageY - this.offsetTop) * 4;
  var type = $("input[@name=type]:checked").val();

  switch(type) {
  case "awake":
    return Shape.showAwake(x, y);
  case "sleep":
    return Shape.showSleep(x, y);
  case "egg":
    return Shape.showEgg(x, y);
  }
}

   // ---------- View Data Structures ----------

   function nameToHue (name) {
     var n = name.charCodeAt(0);
     return (91 * n + 7) % 360;
   };

   // The super class of shape classes.
   function View () {};

   View.prototype = {
     translate: function (x, y) {
       var translate = "translate(" + x + "," + y + ")";
       stage.change(this.shape(), {transform: translate});
     },
     shape: function() {
       if (this._shape) return this._shape;
       this._shape = this.makeShape();
       return this._shape;
     },
     show: function (x, y) {
       this.translate(x, y);
       stage.root().appendChild(this.shape());
       return this;
     },
     underOld: function (aBoolean) { return false; },
     width: function () { return 0; },
     height: function () { return 0; }
   };

   // Variable Name
   // @param idx (string) variable name
   function Egg(idx) {
     this.idx = idx;
   }

   Egg.prototype = $.extend({}, View.prototype, {
     toString: function () {
       return "Egg(" + this.idx + ")";
     },
     makeShape: function() {
       var newImg = EggShape.cloneNode(true);
       newImg.setAttribute("class", "shape");
       newImg.id = getNewId();

       var hue = nameToHue(this.idx);
       stage.style("#" + newImg.id + " .border { fill: hsl(" + hue + ",100%,25%) }"
                   + "#" + newImg.id + " .skin { fill: hsl(" + hue + ",100%,65%) }" );
       return newImg;
     },
     width: function () { return EggWidth; },
     height: function () { return EggHeight; }
   });

   function Eggs(terms) {
     this.terms = terms;
     this._underOld = false; // true if it is enclosed by other eggs (old alligator)
   }

   Eggs.prototype = $.extend({}, View.prototype, {
     underOld: function (aBoolean) {
       if (aBoolean !== undefined) {
         this._underOld = aBoolean;
       }
       return this._underOld;
     },
     toString: function () {
       var inner = this.terms.map(function(e) {
                                    return e.toString();
                                  }).join(",");
       return "Eggs[" + inner + "]";
     },
     makeShape: function() {
       var g = document.createElementNS($.svg.svgNS, "g");
       g.setAttribute("class", "shape");
       var x = 0;

       if (this.underOld()) {
         var _x = (AlligatorWidth - this.termWidth()) / 2;
         var ax = _x < 0 ? -_x : 0;
         x = _x >= 0 ? _x : 0;

         var shape = this.oldShape();
         stage.change(shape, {transform: "translate(" + ax + ", -50)"});
         g.appendChild(shape);
       }
       var y = this.underOld() ? AlligatorHeight : 0;

       $.each(this.terms, function(i, each) {
         each.underOld(each instanceof Eggs);
         g.appendChild(each.shape()); // warning: It updates uniderOld of the children.
       });

       var termHeight = this.termHeight();

       $.each(this.terms, function(i, each) {
         var dy = (termHeight - each.height()) / 2;
         each.translate(x, y + dy);
         x += each.width();
       });

       stage.rect(g, 0, 0, this.width(), this.height(), 20, 20,
         {fill: 'none',  stroke: 'green', strokeWidth: 2});

       return g;
     },
     oldShape: function() {
       var newImg = AlligatorShape.cloneNode(true);
       stage.style("#" + newImg.id + " .border { fill: hsl(0,0%,50%) }"
                   + "#" + newImg.id + " .skin { fill: hsl(0,0%,100%) }" );
       var translate = "translate(" + 0 + "," + (0 - 50) + ")";
       stage.change(newImg, {transform: translate});
       stage.change($("#face", newImg)[0], {transform: "rotate(35, 200, 100)"});
       return newImg;
     },
     termWidth: function () {
       return this.terms.reduce(function(tally, each) { return tally + each.width(); }, 0);
     },
     width: function () {
       var termWidth = this.termWidth();
       return this.underOld() ? Math.max(termWidth, AlligatorWidth) : termWidth;
     },
     termHeight: function () {
       return this.terms.reduce(function(max, each) { return Math.max(max, each.height()); }, 0);
     },
     height: function () {
       return this.underOld() ? AlligatorHeight + this.termHeight() : this.termHeight();
     }
   });

   function Awake(name, term) {
     this.name = name;
     this.term = term;
   }

   Awake.prototype = $.extend({}, View.prototype, {
     toString: function () {
       return "Awake(" + this.name + "," + this.term.toString() + ")";
     },
     translate: function (x, y) {
       this.x = x;
       this.y = y;
       var translate = "translate(" + x + "," + (y - 50) + ")";
       stage.change(this.shape(), {transform: translate});
     },
     animate: function() {
       var cx = 228;
       var cy = 70;
       var translate = "translate(" + this.x + "," + (this.y - 50) + ")";
       var rotate0 = "rotate(0, " + cx + "," + cy + ")";
       var rotate1 = "rotate(360, " + cx + "," + cy + ")";
       var face = $("#face", this.shape());

       stage.change(this.shape(), {transform: translate + rotate0});
       stage.change(face[0], {transform: "rotate(35, 200, 100)"});

       $(this.shape()).animate({svgTransform: translate + rotate1}, 1000,
       function() { face.animate({svgTransform: "rotate(0, 200, 100)"}, 200); });
     },
     makeShape: function() {
       var g = document.createElementNS($.svg.svgNS, "g");
       g.setAttribute("class", "shape");

       var newImg = AlligatorShape.cloneNode(true);
       newImg.id = getNewId();

       var hue = nameToHue(this.name);
       stage.style("#" + newImg.id + " .border { fill: hsl(" + hue + ",100%,25%) }"
                   + "#" + newImg.id + " .skin { fill: hsl(" + hue + ",100%,65%) }" );

       g.appendChild(newImg);
       g.appendChild(this.term.shape());

       var x = (AlligatorWidth - this.term.width()) / 2;
       var ax = x < 0 ? -x : 0;
       var tx = x >= 0 ? x : 0;

       stage.change(newImg, {transform: "translate(" + ax + ", 0)"});

       this.term.translate(tx, AlligatorHeight + 50);

       stage.rect(g, ax, 50, AlligatorWidth, AlligatorHeight, 20, 20,
                  {fill: 'none',  stroke: 'red', strokeWidth: 2});

       stage.rect(g, 0, 50, this.width(), this.height(), 20, 20,
                  {fill: 'none',  stroke: 'blue', strokeWidth: 2});
       return g;
     },
     width: function () {
       return Math.max(this.term.width(), AlligatorWidth);
     },
     height: function () {
       return AlligatorHeight + this.term.height();
     }
   });

   Shape.Egg = Egg;
   Shape.Eggs = Eggs;
   Shape.Awake = Awake;

   // ---------- SVG Surface ----------


Shape.showEgg = function (x, y) {
  var name = $("#varname").val();
  (new Egg(name)).show(x, y);
};

Shape.showSleep = function (x, y) {
  var name = $("#varname").val();
  (new Eggs([new Egg(name), new Eggs([new Egg(name), new Egg(name)])])).show(x, y);
};

Shape.showAwake = function (x, y) {
  var name = $("#varname").val();
  (new Awake(name, new Egg("y"))).show(x, y).animate();
  return;
};

}) ();
