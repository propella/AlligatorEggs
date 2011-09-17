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
     $("#stage svg").click(onclick);
   };

   Shape.init = function (_stage) {
     _stage.svg({ onLoad: function () { loadShapes(_stage); } });
   };

   Shape.remove = function () {
     console.log($(".shape", stage.root()));
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
     EggWidth = $(EggSVG).attr("width");
     EggHeight = $(EggSVG).attr("height");
   }

   function initAlligator (wrapper) {
     AlligatorShape = $("#alligator", AlligatorSVG)[0];
     AlligatorWidth = $(AlligatorSVG).attr("width");
     AlligatorHeight = $(AlligatorSVG).attr("height");
   }

function onclick (event) {
  var x = event.pageX - this.offsetLeft;
  var y = event.pageY - this.offsetTop;
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
     }
   };

   // Variable Name
   // @param idx (string) variable name
   function Egg(idx) {
     this.idx = idx;
   }

   Egg.prototype = $.extend(new View(), {
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
     }
   });


   function Eggs(terms) {
     this.terms = terms;
   }

   Eggs.prototype = $.extend(new View(), {
     toString: function () {
       var inner = this.terms.map(function(e) {
                                    return e.toString();
                                  }).join(",");
       return "Eggs[" + inner + "]";
     },
     makeShape: function() {
       var g = document.createElementNS($.svg.svgNS, "g");
       for (var i = 0; i < this.terms.length; i++) {
         this.terms[i].translate(i * EggWidth, 0);
         g.appendChild(this.terms[i].shape());
       }
       return g;
     }
   });

   function Awake(name, term) {
     this.name = name;
     this.term = term;
   }

   Awake.prototype = $.extend(new View(), {
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

       var newImg = AlligatorShape.cloneNode(true);
       newImg.setAttribute("class", "shape");
       newImg.id = getNewId();

       var hue = nameToHue(this.name);
       stage.style("#" + newImg.id + " .border { fill: hsl(" + hue + ",100%,25%) }"
                   + "#" + newImg.id + " .skin { fill: hsl(" + hue + ",100%,65%) }" );

       g.appendChild(newImg);
       this.term.translate(0, AlligatorHeight);
       g.appendChild(this.term.shape());
       return g;
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

  var a = $("#alligator", AlligatorSVG)[0];
  var newImg = stage.clone(a)[0];
  newImg.setAttribute("class", "shape");
  newImg.id = getNewId();

  stage.style("#" + newImg.id + " .border { fill: hsl(0,0%,50%) }"
              + "#" + newImg.id + " .skin { fill: hsl(0,0%,100%) }" );

  var translate = "translate(" + x + "," + (y - 50) + ")";

  stage.change(newImg, {transform: translate});
  stage.change($("#face", newImg)[0], {transform: "rotate(35, 200, 100)"});
};

Shape.showAwake = function (x0, y0) {
  var name = $("#varname").val();
  (new Awake(name, new Egg("y"))).show(x0, y0).animate();
  return;
};

}) ();
