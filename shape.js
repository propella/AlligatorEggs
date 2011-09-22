// Graphical wrapper for alligator pictures.
//
// Egg represents a variable
// Eggs represents applications (can have more than two elements, these are left associative)
// Awake represents abstraction (a lambda expression)

var Shape = {};

(function() {

//   var Stage; // SVG Wrapper for the stage object.

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

   function newText(x, y, string) {
     var text = document.createElementNS($.svg.svgNS, "text");
     text.setAttribute("x", x);
     text.setAttribute("y", y);
     text.setAttribute("class", "border");
//     text.setAttribute("font-family", "Helvetica");
     text.setAttribute("font-size", "40");
     $(text).text(string);
     return text;
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
     for (var i = 1; i < name.length; i++) {
       n += name.charCodeAt(0);
     }

     var hue = (73 * n + 7) % 360;
     return "#" + id + " .border { fill: hsl(" + hue + ",100%,25%) }"
          + "#" + id + " .skin { fill: hsl(" + hue + ",100%,65%) }";
   };

   function translate(x, y) { return "translate(" + x + "," + y + ") "; }
   function scale(n) { return "scale(" + n + ") "; }

   // ---------- Shape Data Structures ----------

   // Common interface of shape objects
   ShapeBase = {
     translate: function (x, y) {
       $(this._shape).attr("transform", translate(x, y) + scale(1));
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
     constructDebugRect: function(parent, color) {
       return;
       this._debugRect = Stage.rect(parent, 0, 0, 100, 100, 20, 20,
         {fill: 'none',  stroke: color, strokeWidth: 2});
     },
     layoutDebugRect: function(yoffset) {
       if (!this._debugRect) return;
       $(this._debugRect).attr("width", this.width());
       $(this._debugRect).attr("height", this.height() + yoffset);
     },
     underOld: function (aBoolean) { return false; },
     width: function () { throw "To be implemented"; },
     height: function () { throw "To be implemented"; }
   };

   // Just for the background
   function Field(shape) {
     this.child = shape;
     this._width = $(Stage.root()).width();
     this._height = $(Stage.root()).height();
     this._minWidth = 0;
     this._minHeight = 0;
   }

   Field.prototype = $.extend({}, ShapeBase,
   {
     replace: function(shape) {
       this.child = shape;
     },
     show: function() {
       this.construct();
       this.layout();
       Stage.root().appendChild(this.child._shape);
     },
     construct: function() {
       this.child.construct();
     },
     layout: function() {
       var childWidth = this.child.width();
       var childHeight = this.child.height();
       if (childWidth > this._minWidth || childHeight > this._minHeight) {
         this._minWidth = childWidth;
         this._minHeight = childHeight;
       }
       var scaleX = this.width() / this._minWidth;
       var scaleY = this.height() / this._minHeight;
       var scaleXY = Math.min(scaleX, scaleY);
       var offsetX = (this.width() - childWidth * scaleXY) / 2;
       var offsetY = (this.height() - childHeight * scaleXY) / 2;
       $(this.child._shape).attr("transform", translate(offsetX, offsetY) + scale(scaleXY));
       this.child.layout();
     },
     width: function () { return this._width; },
     height: function () { return this._height; }
   });

   // Variable Name
   // @param idx (string) variable name
   // @param model (Term) lambda term
   function Egg(idx, term) {
     this.idx = idx;
     this.term = term;
     this._animationPos = 0; // 0 to 1.0
     this._newborn = null; // Animated shape.
   }

   Egg.prototype = $.extend({}, ShapeBase,
   {
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
       var eggShape = EggShape.cloneNode(true);
       eggShape.id = getNewId();
       Stage.style(eggShape, nameToStyle(eggShape.id, this.idx));

       var g = document.createElementNS($.svg.svgNS, "g");
       g.setAttribute("class", "shape");
       g.appendChild(eggShape);

       eggShape.appendChild(newText(EggWidth / 2 - 10, EggHeight / 2 + 10, this.idx));

       this._shape = g;
       return g;
     },
     layout: function() {
       if (!this._newborn) return;
       $(this._shape.firstChild).attr("opacity", (1 - this._animationPos));
       $(this._shape.firstChild).attr("transform", translate(
                              Math.max((this.newbornWidth() - EggWidth) / 2, 0),
                              Math.max((this.newbornHeight() - EggHeight) / 2, 0)));
     },
     newbornWidth: function() { return this._newborn.width() * this._animationPos; },
     newbornHeight: function() { return this._newborn.height() * this._animationPos; },
     width: function () {
       return this._newborn ? Math.max(EggWidth, this.newbornWidth()) : EggWidth;
     },
     height: function () {
       return this._newborn ? Math.max(EggHeight, this.newbornHeight()) : EggHeight;
     },
     animateHatch: function(arg, step) {
       var shape = arg._shape.cloneNode(true);

       $(shape).attr("visibility", "visible");
       $(shape).attr("transform", translate(EggWidth / 2, EggHeight / 2) + scale(0));
       this._shape.appendChild(shape);
       var self = this;
       $(shape).animate({svgTransform: translate(0, 0) + scale(1)},
                                {duration: 1000,
                                step: function(now, fx) {
                                    self._animationPos = fx.pos;
                                    step();
                                    }
                                });

       this._newborn = $.extend({}, arg); // Copy original
       this._newborn._shape = shape;
     }
   });

   // Application
   // @param terms (Array) object to be applied. right associative.
   // @param model (Term) lambda term
   function Eggs(children, term) {
     this.children = children;
     this.term = term;
     this._underOld = false; // true if it is enclosed by other eggs (old alligator)
     this._animationPos = 0; // 0 to 1.0
     this._debugRect = null; // Layout area
   }

   Eggs.prototype = $.extend({}, ShapeBase,
   {
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

       this.constructDebugRect(g, "green");
       this._shape = g;
       return g;
     },
     layout: function () {
       var tx = 0;

       this.layoutDebugRect(0);

       if (this.underOld()) {
         var x = (AlligatorWidth - this.childWidth()) / 2;
         y = -50;
         var ax = x < 0 ? -x : 0;
         tx = x >= 0 ? x : 0;

         var alligator = this._shape.firstChild;
         $(alligator).attr("transform", translate(ax, y));
         $("#face", alligator).attr("transform", "rotate(35, 200, 100)");

       }

       var y = this.underOld() ? AlligatorHeight : 0;
       var childHeight = this.childHeight();
       var argChildWidth = this.children[1].width();
       var animationPos = this._animationPos;

       $.each(this.children, function(i, each) {
         var dy = (childHeight - each.height()) / 2;
         each.layout();
         var dx = 0;
         if (i > 1) {
           dx = -argChildWidth * animationPos;
         }
         $(each._shape).attr("transform", translate(tx + dx, y + dy) + scale(1));
         tx += each.width();
       });
     },

     sleepingShape: function() {
       var newImg = AlligatorShape.cloneNode(true);
       Stage.style("#" + newImg.id + " .border { fill: hsl(0,0%,50%) }"
                   + "#" + newImg.id + " .skin { fill: hsl(0,0%,100%) }" );
       return newImg;
     },
     childWidth: function () {
       var allWidth = this.children.reduce(function(tally, each) { return tally + each.width(); }, 0);
       return allWidth - this.children[1].width() * this._animationPos;
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
     animateEat: function(step, callback) {
       var func = this.children[0];
       var arg = this.children[1];

       var x = func.width() / 2 + 80;
       var y = 30 + (this.underOld() ? AlligatorHeight : 0);

       var alias = arg._shape.cloneNode(true);
       this._shape.appendChild(alias);
       var self = this;
       $(arg._shape).attr("visibility", "hidden");

       var face = $("#face", func._alligatorShape);
       face.attr("transform", "rotate(35, 200, 100)");
       face.animate({svgTransform: "rotate(-35, 200, 100)"});


       $(alias).animate({svgTransform: translate(x, y) + scale(0)},
                        {duration: 1000,
                         step: step,
                         complete: callback
                        });
     },
     animateHatch: function(step) {
       var func = this.children[0];
       var arg = this.children[1];
       var vars = findSbst(this.term[1], -1);
       var eggs = vars.map(function(each) { return func.findTerm(each); });
       $.each(eggs, function(i, egg) { egg.animateHatch(arg, step); });
     },
     animateDead: function(step) {
       this.children[0].animateDead(step);
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
     this._animationPos = 0;
     this._alligatorShape = null;
   }

   Awake.prototype = $.extend({}, ShapeBase,
   {
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
       this._x = x;
       this._y = y;
       $(this._shape).attr("transform", translate(x, y) + scale(1));
     },
     animate: function() { // only for test
       var cx = 228;
       var cy = 70;
       var translate = "translate(" + this._x + "," + (this._y - 50) + ")";
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
       this._alligatorShape = AlligatorShape.cloneNode(true);
       this._alligatorShape.id = getNewId();
       Stage.style(g, nameToStyle(this._alligatorShape.id, this.name));

       g.appendChild(this._alligatorShape);
       g.appendChild(this.child.construct());
       this._alligatorShape.appendChild(newText(50, 80, this.name));

       this._shape = g;
       this.constructDebugRect(g, "blue");
       return g;
     },
     layout: function () {
       var x = (this.alligatorWidth() - this.child.width()) / 2;
       var ax = x < 0 ? -x : 0;
       var tx = x >= 0 ? x : 0;
       $(this._alligatorShape).attr("transform", translate(ax, -50));
       this.child.layout();
       $(this.child._shape).attr("transform", translate(tx, this.alligatorHeight()) + scale(1));
       this.layoutDebugRect(0);
     },

     alligatorWidth: function() { return AlligatorWidth * (1 - this._animationPos); },
     alligatorHeight: function() { return AlligatorHeight * (1 - this._animationPos); },
     width: function () { return Math.max(this.alligatorWidth(), this.child.width()); },
     height: function () { return this.alligatorHeight() + this.child.height(); },

     animateDead: function(step) {
       var cx = 228;
       var cy = 70;
       var cx = 300;
       var cy = 300;
       var rotate0 = "rotate(0, " + cx + "," + cy + ")";
       var rotate1 = "rotate(360, " + cx + "," + cy + ")";

       var x = (this.alligatorWidth() - this.child.width()) / 2;
       var ax = x < 0 ? -x : 0;
       var tx = x >= 0 ? x : 0;
       var trans = translate(ax, -100);
       $(this._alligatorShape).attr("transform", trans + rotate0);

       $(this._alligatorShape).attr("opacity", "1");

       var self = this;
       $(this._alligatorShape).animate({svgOpacity: 0,
                                        svgTransform: trans + rotate1
                                       },
                              {duration: 1000,
                               step: function(now, fx) {
                                 self._animationPos = fx.pos;
                                 step();
                               },
                               complete: function() {
                                 $(self._alligatorShape).attr("visibility", "hidden");
                               }
                              });
     }
   });

   Shape.Field = Field;
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
