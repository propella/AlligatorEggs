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

var ResultTimeID = null;
var PlayTimeID = null;
var TheTerm = null;
var TheShape = null;

var Field = Shape.Field;
var Egg = Shape.Egg;
var Eggs = Shape.Eggs;
var Awake = Shape.Awake;
var InputSource = function() { return $("#exp").val(); };

var PlayState = "WAIT"; // "WAIT" | "PLAY" | "STOP"

// ---------- Transcript ----------

function out(aString) {
  var transcript = $("#transcript");
  transcript.text(transcript.text() + aString + "\r\n");
}

// ---------- Alligator State Machine Commands ----------

// Show initial state
function showIt() {
  stop();
  PlayState = "WAIT";
  TheField = new Field();
  showExpression(InputSource());
  return false;
}

// One step animation.
// Return true if there is more room to reduce.
function next () {
  stop();
  playOnce();
}

function playOnce() {
  if (!TheTerm) return false;
  var view = TheShape;
  var app = findApp(TheTerm);

  var appliedShape = view.findTerm(app);
  if (!appliedShape) return false;

  var newTerm = eval1(TheTerm);
  if (!newTerm) return false;

  appliedShape.animateEat(
    function(now, fx) {
      appliedShape._animationPos = fx.pos;
      TheField.layout();
    },
    function() {
    });

  setTimeout(function() {
    appliedShape.animateDead(function() { TheField.layout(); });
  }, 1000);

  setTimeout(function() {
    appliedShape.animateHatch(function() { TheField.layout(); });
  }, 2000);

  ResultTimeID = setTimeout(function() {
    out(show(newTerm, []));
    TheTerm = newTerm;
    if (TheTerm) showResult(TheTerm);
  }, 3000);
  return true;
}

// Do appropriate thing.
function fire() {
  if (PlayState == "WAIT") {
    showIt();
    return play();
  }
  if (PlayState == "PLAY") return stop();
  if (PlayState == "STOP") return play();
  throw "Unknown play state";
}

function play () {
  PlayState = "PLAY";
  var more = playOnce();
  if (!more) {
    PlayState = "WAIT";
    return;
  }
  PlayTimeID = setTimeout(play, 3000);
}

function stop() {
  PlayState = "STOP";
  clearTimeout(ResultTimeID);
  clearTimeout(PlayTimeID);
}

// ---------- Output ----------

// Show Alligators and others
function showExpression(string) {
  TheTerm = parse(string);
  if (!TheTerm) out("Syntax error");
  else showResult(TheTerm);
  out(show(TheTerm, []));
  document.location.hash = "#!/" + encodeURIComponent(string);
  $("#iframesource").text(iframeSource(string));
  $("#gadgetsource").text(gadgetSource(string));
}

// Show Alligators
function showResult(term) {
  var view = Shape.fromTerm(term, []);
  TheShape = view;
  Shape.remove();
  TheField.replace(view);
  TheField.show();
}

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
  return "<script src=\"http://www.gmodules.com/ig/ifr?url=http://metatoys.org/alligator/gadget.xml&amp;up_Expression=" + exp + "&amp;synd=open&amp;w=400&amp;h=300&amp;output=js\"></script>";
}

// ---------- Initialization ----------

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
  var query = getCGIQuery();
  $("#stage").width(query["width"]);
  $("#stage").height(query["height"]);
  $("#stage").click(fire);
  window.onhashchange = showIt;
  InputSource = function() { return getQuery(); };
  Shape.init($("#stage"), showIt);
}

function initGadget() {
  $("#stage").click(fire);
  InputSource = function() { return $.pref("Expression"); };
  Shape.init($("#stage"), showIt, "http://metatoys.org/alligator/egg.svg", "http://metatoys.org/alligator/open.svg");

//    Shape.demo("http://metatoys.org/alligator/egg.svg", "http://metatoys.org/alligator/open.svg");
}

// Read from the hash bang string.
function initExp() {
  var query= getQuery();
  if (query == "") return;
  $("#exp").val(query);
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

