// Graphical wrapper for alligator pictures.
//
// Egg represents a variable
// Eggs represents applications (can have more than two elements, these are left associative)
// Awake represents abstraction (a lambda expression)

var Shape = {};

(function() {

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
     constructDebugRect: function(parent, color) {
       color = 'none';
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
     height: function () { throw "To be implemented"; },
     eatAnimation: function() { throw "To be implemented"; }
   };

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
       var newImg = EggShape.cloneNode(true);
       newImg.setAttribute("class", "shape");
       newImg.id = getNewId();
       Stage.style(nameToStyle(newImg.id, this.idx));
       this._shape = newImg;
       return newImg;
     },
     layout: function() {
//       if (!this._newborn) return;
//       $(this._newborn).attr("transform", "scale(" + this._animationPos + ")");
     },
     width: function () {
       if  (this._newborn) {
         return Math.max(EggWidth, this._newborn.width() * this._animationPos);
       } else {
         return EggWidth;
       }
     },
     height: function () {
       if  (this._newborn) {
         return Math.max(EggHeight, this._newborn.height() * this._animationPos);
       } else {
         return EggHeight;
       }
     },
     animateHatch: function(arg, step) {
       this._newborn = $.extend({}, arg); // Copy original
       this._newborn._shape = arg._shape.cloneNode(true);

       $(this._newborn._shape).attr("visibility", "visible");
       $(this._newborn._shape).attr("transform", "translate(0,-50)");
       this._shape.appendChild(this._newborn._shape);
       var self = this;
       $(this._newborn._shape).animate({svgTransform: "translate(0, -50) scale(1)"},
                                {duration: 1000,
                                step: function(now, fx) {
                                    self._animationPos = fx.pos;
                                    step();
                                    }
                                });
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
         $(alligator).attr("transform", "translate(" + ax + ", " + y + ")");
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
         each.translate(tx + dx, y + dy);
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
       var x = func.width() / 2;
       var y = 0;
       var alias = arg._shape.cloneNode(true);
       this._shape.appendChild(alias);
       var self = this;
       $(arg._shape).attr("visibility", "hidden");

       $(alias).animate({svgTransform: "translate(" + x + "," + y + ") scale(0)"},
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
       this.constructDebugRect(g, "blue");
       return g;
     },
     layout: function () {
       var x = (AlligatorWidth - this.child.width()) / 2;
       var ax = x < 0 ? -x : 0;
       var tx = x >= 0 ? x : 0;

       $(this._shape.firstChild).attr("transform", "translate(" + ax + ", 0)");
       this.child.layout();
       this.child.translate(tx, AlligatorHeight * (1 - this._animationPos) + 50);
       this.layoutDebugRect(50);

//       Stage.rect(this._shape, 0, 50, this.width(), this.height(), 20, 20,
//                  {fill: 'none',  stroke: 'blue', strokeWidth: 2});

     },
     width: function () {
       return Math.max(this.child.width(), AlligatorWidth);
     },
     height: function () {
       return AlligatorHeight * (1 - this._animationPos) + this.child.height();
     },
     animateDead: function(step) {
       var cx = 228;
       var cy = 70;
       var translate = "translate(" + this.x + "," + (this.y - 50) + ")";
       var rotate0 = "rotate(0, " + cx + "," + cy + ")";
       var rotate1 = "rotate(360, " + cx + "," + cy + ")";
       var face = $("#face", this._shape);

       $(this._shape).attr("transform", translate + rotate0);
       face.attr("transform", "rotate(35, 200, 100)");

       var self = this;
       $(this._shape.firstChild).animate({svgTransform: translate + rotate1},
                              {duration: 1000,
                               step: function(now, fx) {
                                 self._animationPos = fx.pos;
                                 step();
                               },
                               complete: function() {
                                 $(self._shape.firstChild).attr("visibility", "hidden");
                               }
                              });
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
