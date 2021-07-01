// alligator.js -*- coding: utf-8 -*-
//
// Copyright (c) 2011 Takashi Yamamiya <tak@metatoys.org>
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following
// conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.

// ---------- Globals ----------

var Field = Shape.Field;
var Egg = Shape.Egg;
var Eggs = Shape.Eggs;
var Awake = Shape.Awake;

// ---------- Transcript ----------

function out(aString) {
  var transcript = $("#transcript");
  transcript.text(transcript.text() + aString + "\r\n");
}

// ---------- Alligator State Machine ----------

// @param input (Function) A function which returns a new input.
function Calculator(input) {
  this.state = "WAIT"; // Animation state, "WAIT" | "PLAY" | "STOP"
  this.inputSource = input;
  this.theField = new Field();
  this.theTerm = null;
  this.theShape = null;
  this.playTimeID = null; // A timer to trigger the next iteration
}

Calculator.prototype =
{
  showIt: function() {
    this.stop();
    this.state = "WAIT";
    this.showExpression(this.inputSource());
    return false;
  },

  // One step animation.
  // Return true if there is more room to reduce.
  next: function() {
    this.stop();
    this.playOnce();
  },

  playOnce: function() {
    if (!this.theTerm) return false;
    var self = this;
    var view = this.theShape;
    var app = findApp(this.theTerm);

    var appliedShape = view.findTerm(app);
    if (!appliedShape) return false;

    var newTerm = eval1(this.theTerm);
    if (!newTerm) return false;

    appliedShape.animateEat(this.theField,
      function() { appliedShape.animateDead(self.theField,
        function() { appliedShape.animateHatch(self.theField,
          function() {
            out(show(newTerm, []));
            self.theTerm = newTerm;
            if (self.theTerm) self.showResult(self.theTerm);
          });
        });
      });

    return true;
  },

  // Do appropriate thing.
  fire: function() {
    if (this.state == "WAIT") {
      this.showIt();
      return this.play();
    }
    if (this.state == "PLAY") return this.stop();
    if (this.state == "STOP") return this.play();
    throw "Unknown play state";
  },

  play: function() {
    this.stop();
    this.state = "PLAY";
    var more = this.playOnce();
    if (!more) {
      this.state = "WAIT";
      return;
    }
    var self = this;
    this.playTimeID = setTimeout(function() { self.play(); }, 3500);
  },

  stop: function() {
    this.state = "STOP";
    clearTimeout(this.playTimeID);
  },

  // Show Alligators and others
  showExpression: function (string) {
    this.theTerm = parse(string);
    if (!this.theTerm) out("Syntax error");
    else this.showResult(this.theTerm);
    out(show(this.theTerm, []));
    document.location.hash = "#!/" + encodeURIComponent(string);
    $("#iframesource").text(iframeSource(string));
    $("#gadgetsource").text(gadgetSource(string));
  },

  // Show Alligators
  showResult: function(term) {
    var view = Shape.fromTerm(term, []);
    this.theShape = view;
    Shape.remove();
    this.theField.replace(view);
    this.theField.show();
  }
};

// ---------- Snippets source code ----------

function iframeSource(expression) {
  var url = location.protocol + "//" +
    location.host +
    location.pathname +
    "iframe.html?width=400&height=300#!/" +
    encodeURIComponent(expression);
  return '<iframe width="400" height="300" src="' + url + '" style="border: 0px solid #8c8;"></iframe>';
}

function gadgetSource(expression) {
  var exp = encodeURIComponent(expression);
  return "<script src=\"http://www.gmodules.com/ig/ifr?url=http://metatoys.org/alligator/gadget.xml&amp;up_Expression=" + exp + "&amp;synd=open&amp;w=320&amp;h=200&amp;title=" + exp + "&amp;border=%23ffffff%7C3px%2C1px+solid+%23999999&amp;output=js\"></script>";
}

// ---------- Event Handlers ----------

var TheCalclator = null;

function showIt() {
  return TheCalclator.showIt();
}

function next() {
  return TheCalclator.next();
}

function play() {
  return TheCalclator.play();
}

function stop() {
  return TheCalclator.stop();
}

function fire() {
  return TheCalclator.fire();
}

// ---------- Initialization ----------

// Entry point of index.html
// Initialize for the main user interface
function initUI() {
  Shape.init($("#stage"), initExp);
  $("#query").submit(showIt);
  $("#enter").click(showIt);
  $("#next").click(next);
  $("#play").click(play);
  $("#stop").click(stop);
  $("#stage").click(fire);
  window.onhashchange = initExp;
  // Shape.runtest();
}

// Initialize for the iframe interface.
function initIframe() {
  Shape.init($("#stage"), showIt);
  var query = getCGIQuery();
  $("#stage").width(query["width"]);
  $("#stage").height(query["height"]);
  $("#stage").click(fire);
  window.onhashchange = showIt;
  if (TheCalclator) TheCalclator.stop();
  TheCalclator = new Calculator(function() { return getQuery(); });
}

function initGadget() {
  $("#stage").click(fire);
  Shape.init($("#stage"),
             showIt,
             "http://metatoys.org/alligator/egg.svg",
             "http://metatoys.org/alligator/open.svg");
  if (TheCalclator) TheCalclator.stop();
  TheCalclator = new Calculator(function() { return $.pref("Expression"); });
}

// Read from the hash bang string.
function initExp() {
  var query= getQuery();
  if (query == "") query = "(λx.x) y";
  $("#exp").val(query);
  if (TheCalclator) TheCalclator.stop();
  TheCalclator = new Calculator(function() { return $("#exp").val(); });
  showIt();
}

// Convert CGI style query (?key=value&key=value...) to an object
function getCGIQuery() {
  var query = window.location.search.substring(1);
  var each = query.split("&");
  var result = {};
  for (var i= 0; i < each.length; i++) {
    var pair= each[i].split("=");
    result[pair[0]] = decodeURIComponent(pair[1]);
  }
  return result;
}

