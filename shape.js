// Graphical wrapper for alligator pictures.

var Shape = {};

(function () {

   var Stage; // SVG Wrapper for the stage object.

   var EggShape;
   var EggWidth;
   var EggHeight;

   var AlligatorShape;
   var AlligatorWidth;
   var AlligatorHeight;

   // Initialize the state
   // @param stage (HTMLElement) An element which SVG is attached.
   Shape.init = function (stage) {
     stage.svg({ onLoad: function () { loadShapes(stage); } });
   };

   // Remove all object on the stage
   Shape.remove = function () {
     $(".shape", Stage.root()).remove();
     return false;
   };

   function loadShapes (stage) {
     Stage = stage.svg('get');
     var defs = Stage.defs();

     var alligatorSVG = Stage.svg(defs);
     Stage.load("open.svg", { parent: alligatorSVG, changeSize: true, onLoad: initAlligator });

     var eggSVG = Stage.svg(defs);
     Stage.load("egg.svg", { parent: eggSVG, changeSize: true, onLoad: initEgg });
   }

   function initEgg (wrapper) {
     EggShape = $("#egg", Stage.root())[0];
     EggWidth = parseFloat($(EggShape.parentNode).attr("width"));
     EggHeight = parseFloat($(EggShape.parentNode).attr("height"));
   }

   function initAlligator (wrapper) {
     AlligatorShape = $("#alligator", Stage.root())[0];
     AlligatorWidth = parseFloat($(AlligatorShape.parentNode.parentNode).attr("width"));
     AlligatorHeight = parseFloat($(AlligatorShape.parentNode.parentNode).attr("height"));
   }

   // ---------- Utilities ----------

   // Utility function to get a new identifier
   var getNewId = function() {
     var id = 0;
     return function () { return "id" + (++id); };
   } ();

   // A heuristic way to map from a function name to a color
   function nameToStyle (id, name) {
     var n = name.charCodeAt(0);
     var hue = (91 * n + 7) % 360;
     return "#" + id + " .border { fill: hsl(" + hue + ",100%,25%) }"
          + "#" + id + " .skin { fill: hsl(" + hue + ",100%,65%) }";
   };

   // ---------- Shape Data Structures ----------

   // Common interface of shape objects
   ShapeBase = {
     translate: function (x, y) {
       var translate = "translate(" + x + "," + y + ") scale(1)";
       $(this._shape).attr("transform", translate);
     },
     show: function (x, y) {
       this.construct();
       this.layout();
       this.translate(x, y);
       Stage.root().appendChild(this._shape);
       return this;
     },
     findTerm: function (term) { throw "Should not be happened"; },
     construct: function() {},
     layout: function () {}, // Layout inside of the object
     underOld: function (aBoolean) { return false; },
     width: function () { throw "To be implemented"; },
     height: function () { throw "To be implemented"; },
     eatAnimation: function() { throw "To be implemented"; }
   };

   // Variable Name
   // @param idx (string) variable name
   // @param model (Term) lambda term
   function Egg(idx, term) {
     this.idx = idx;
     this.term = term;
   }

   Egg.prototype = $.extend({}, ShapeBase, {
     toString: function () {
       return "Egg(" + this.idx + ")";
     },
     findTerm: function(term) {
       if (this.term === term) {
         return this;
       } else {
         return null;
       }
     },
     construct: function () {
       var newImg = EggShape.cloneNode(true);
       newImg.setAttribute("class", "shape");
       newImg.id = getNewId();
       Stage.style(nameToStyle(newImg.id, this.idx));
       this._shape = newImg;
       return newImg;
     },
     width: function () { return EggWidth; },
     height: function () { return EggHeight; }
   });

   // Application
   // @param terms (Array) object to be applied. right associative.
   // @param model (Term) lambda term
   function Eggs(children, term) {
     this.children = children;
     this.term = term;
     this._underOld = false; // true if it is enclosed by other eggs (old alligator)
   }

   Eggs.prototype = $.extend({}, ShapeBase, {
     underOld: function (aBoolean) {
       if (aBoolean !== undefined) {
         this._underOld = aBoolean;
       }
       return this._underOld;
     },
     findTerm: function(term) {
       if (this.term === term) {
         return this;
       } else {
         for (var i = 0; i < this.children.length; i++) {
           var found = this.children[i].findTerm(term);
           if (found) return found;
         }
       }
       return null;
     },
     toString: function () {
       var inner = this.children.map(function(e) {
                                    return e.toString();
                                  }).join(",");
       return "Eggs[" + inner + "]";
     },
     construct: function () {
       var g = document.createElementNS($.svg.svgNS, "g");
       g.setAttribute("class", "shape");

       if (this.underOld()) {
         var shape = this.sleepingShape();
         g.appendChild(shape);
       }

       $.each(this.children, function(i, each) {
         each.underOld(each instanceof Eggs);
         g.appendChild(each.construct());
       });
       this._shape = g;
       return g;
     },
     layout: function () {
       var tx = 0;

       if (this.underOld()) {
         var x = (AlligatorWidth - this.childWidth()) / 2;
         var ax = x < 0 ? -x : 0;
         tx = x >= 0 ? x : 0;

         var alligator = this._shape.firstChild;
         $(alligator).attr("transform", "translate(" + ax + ", -50)");
         $("#face", alligator).attr("transform", "rotate(35, 200, 100)");
       }

       var y = this.underOld() ? AlligatorHeight : 0;
       var childHeight = this.childHeight();

       $.each(this.children, function(i, each) {
         var dy = (childHeight - each.height()) / 2;
         each.layout();
         each.translate(tx, y + dy);
         tx += each.width();
       });

       Stage.rect(this._shape, 0, 0, this.width(), this.height(), 20, 20,
         {fill: 'none',  stroke: 'green', strokeWidth: 2});
     },
     sleepingShape: function() {
       var newImg = AlligatorShape.cloneNode(true);
       Stage.style("#" + newImg.id + " .border { fill: hsl(0,0%,50%) }"
                   + "#" + newImg.id + " .skin { fill: hsl(0,0%,100%) }" );
       return newImg;
     },
     childWidth: function () {
       return this.children.reduce(function(tally, each) { return tally + each.width(); }, 0);
     },
     width: function () {
       var childWidth = this.childWidth();
       return this.underOld() ? Math.max(childWidth, AlligatorWidth) : childWidth;
     },
     childHeight: function () {
       return this.children.reduce(function(max, each) { return Math.max(max, each.height()); }, 0);
     },
     height: function () {
       return this.underOld() ? AlligatorHeight + this.childHeight() : this.childHeight();
     },
     animateEat: function(callback) {
       var func = this.children[0];
       var arg = this.children[1];
       var rest = this.children.slice(2);
       var funcWidth = func.width();
       var side = funcWidth + arg.width();
       var transforms = rest.map(function(e) { return $(e._shape).attr("transform"); });
       var x = func.width() / 2;
       var y = 0;
       $(arg._shape).animate({svgTransform: "translate(" + x + "," + y + ") scale(0)"},
                              {ducation: 500,
                              step: function(now, fx) {
                                var x = -arg.width() * fx.pos;
                                var delta = "translate(" + x + ",0)";
                                $.each(rest, function(i, each) {
                                         $(each._shape).attr("transform", transforms[i] + delta);
                                       });
                                },
                              complete: callback
                              });
         }
   });

   // Abstraction
   // @param name (String) A variable name
   // @param child (ViewBase)
   // @param model (Term) lambda term
   function Awake(name, child, term) {
     this.name = name;
     this.child = child;
     this.term = term;
   }

   Awake.prototype = $.extend({}, ShapeBase, {
     toString: function () {
       return "Awake(" + this.name + "," + this.child.toString() + ")";
     },
     findTerm: function(term) {
       if (this.term === term) {
         return this;
       }
       var found = this.child.findTerm(term);
       if (found) return found;
       return null;
     },
     translate: function (x, y) {
       this.x = x;
       this.y = y;
       var translate = "translate(" + x + "," + (y - 50) + ") scale(1)";
       $(this._shape).attr("transform", translate);
     },
     animate: function() {
       var cx = 228;
       var cy = 70;
       var translate = "translate(" + this.x + "," + (this.y - 50) + ")";
       var rotate0 = "rotate(0, " + cx + "," + cy + ")";
       var rotate1 = "rotate(360, " + cx + "," + cy + ")";
       var face = $("#face", this._shape);

       $(this._shape).attr("transform", translate + rotate0);
       face.attr("transform", "rotate(35, 200, 100)");

       $(this._shape).animate({svgTransform: translate + rotate1}, 1000,
       function() { face.animate({svgTransform: "rotate(0, 200, 100)"}, 200); });
     },
     construct: function () {
       var g = document.createElementNS($.svg.svgNS, "g");
       g.setAttribute("class", "shape");
       var newImg = AlligatorShape.cloneNode(true);
       newImg.id = getNewId();
       Stage.style(nameToStyle(newImg.id, this.name));
       g.appendChild(newImg);
       g.appendChild(this.child.construct());
       this._shape = g;
       return g;
     },
     layout: function () {
       var x = (AlligatorWidth - this.child.width()) / 2;
       var ax = x < 0 ? -x : 0;
       var tx = x >= 0 ? x : 0;

       $(this._shape.firstChild).attr("transform", "translate(" + ax + ", 0)");
       this.child.layout();
       this.child.translate(tx, AlligatorHeight + 50);

       Stage.rect(this._shape, 0, 50, this.width(), this.height(), 20, 20,
                  {fill: 'none',  stroke: 'blue', strokeWidth: 2});

     },
     width: function () {
       return Math.max(this.child.width(), AlligatorWidth);
     },
     height: function () {
       return AlligatorHeight + this.child.height();
     }
   });

   Shape.Egg = Egg;
   Shape.Eggs = Eggs;
   Shape.Awake = Awake;

   // ---------- Test code for shape.html ----------

   Shape.demo = function () {
     Shape.init($("#stage"));
     $("#stage > svg").attr("viewBox", "0 0 1600 1200");
     $("#stage > svg").click(onclick);
   };

   function onclick (event) {
     var x = (event.pageX - this.offsetLeft) * 4;
     var y = (event.pageY - this.offsetTop) * 4;
     var type = $("input[@name=type]:checked").val();

     switch(type) {
     case "awake":
       showAwake(x, y);
       break;
     case "sleep":
       showSleep(x, y);
       break;
     case "egg":
       showEgg(x, y);
       break;
     }
   }

   function showEgg (x, y) {
     var name = $("#varname").val();
     (new Egg(name)).show(x, y);
   }

   function showSleep (x, y) {
     var name = $("#varname").val();
     (new Eggs([new Egg(name), new Eggs([new Egg(name), new Egg(name)])])).show(x, y);
   }

   function showAwake (x, y) {
     var name = $("#varname").val();
     (new Awake(name, new Egg("y"))).show(x, y).animate();
     return;
   }

}) ();
