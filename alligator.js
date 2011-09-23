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

var PlayState = "WAIT"; // "WAIT" | "PLAY" | "STOP"

// ---------- User Interface ----------

function out(aString) {
  var transcript = $("#transcript");
  transcript.text(transcript.text() + aString + "\r\n");
}

function showIt() {
  stop();
  PlayState = "WAIT";
  TheField = new Field();
  var expression = $("#exp").val();
  document.location.hash = "#!/" + encodeURIComponent(expression);

  TheTerm = parse(expression);
  if (!TheTerm) out("Syntax error");
  else showResult(TheTerm);
  out(show(TheTerm, []));

  $("#iframesource").text(iframeSource(expression));

  return false;
}

function iframeSource(expression) {

  var url = location.protocol + "//" +
    location.host +
    location.pathname +
    "iframe.html?width=400&height=300#!/" +
    encodeURIComponent(expression);
  return '<iframe width="400" height="300" src="' + url + '" style="border: 0px solid #8c8;"></iframe>';
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

function showResult(term) {
  var view = termToView(term, []);
  TheShape = view;
  Shape.remove();
//  TheField = new Field(view);
  TheField.replace(view);
  TheField.show();
}

// ---------- Initialization ----------

$(function() {
  Shape.init($("#stage"), initExp);
  $("#query").submit(showIt);
  $("#enter").click(showIt);
  $("#next").click(next);
  $("#play").click(play);
  $("#stop").click(stop);
  $("#stage").click(fire);
//  runViewTest();
});

function initExp() {
  var query= getQuery();
  if (query == "") return;
  $("#exp").val(query);
  showIt();
}

// Initialize for iframe. It must be called before Shape.init
function initIframe() {
  var query = getQuery2();
  $("#stage").width(query["width"]);
  $("#stage").height(query["height"]);
}

// Convert CGI style query (?key=value&key=value...) to an object
function getQuery2() {
  var query = window.location.search.substring(1);
  var each = query.split("&");
  var result = {};
  for (var i= 0; i < each.length; i++) {
    var pair= each[i].split("=");
    result[pair[0]] = decodeURIComponent(pair[1]);
  }
  return result;
}

window.onhashchange = initExp;

// ---------- View Data Structures ----------

function termToView(term, ctx) {
  switch (term[0]) {
  case Var:
    if (typeof term[1] == "number" && term[1] < ctx.length) return new Egg(ctx[term[1]], term);
    if (typeof term[1] == "number") return new Egg("?" + term[1], term);
    return new Egg(term[1], term);
  case Abs:
    var pair = pickFreshName(ctx, term[1]);
    return new Awake(pair[1], termToView(term[2], pair[0]), term);
  case App:
    return termToEggs(term, ctx);
  }
  throw	"unknown tag:" + term[0];
}

function termToEggs(term, ctx) {
  switch (term[0]) {
  case Var:
  case Abs:
    return new Eggs([termToView(term, ctx)], term);
  case App:
    var t1 = term[1];
    var t2 = term[2];
    var show1 = termToEggs(t1, ctx);
    var show2 = termToView(t2, ctx);
    var thisTerm = show1.term[0] == App ? t1 : term; // fix me
    return new Eggs(show1.children.concat(show2), thisTerm);
  }
  throw	"unknown tag:" + term[0];
}


function runViewTest() {
  out("-- termToView test --");
  var t;
  t = parseTerm("x",["x"])[1];
  testEq(termToView(t, ["x"]), new Egg("x", t));

  t = parse("x");
  testEq(termToView(t, []), new Egg("x", t));

  testEq(termToView(parse("λx.x"),[]).toString(), "Awake(x,Egg(x))");

  t = parse("x y");
  testEq(termToView(t,[]).toString(), "Eggs[Egg(x),Egg(y)]");
  testEq(termToView(t,[]).term, t);
  testEq(termToView(t,[]).children[0].term, [Var, "x"]);
  testEq(termToView(t,[]).children[1].term, [Var, "y"]);

  t = parse("x x x");
  testEq(termToView(t,[]).toString(), "Eggs[Egg(x),Egg(x),Egg(x)]");
  testEq(termToView(t,[]).term, parse("x x"));

  testEq(termToView(parse("x (x x)"),[]).toString(), "Eggs[Egg(x),Eggs[Egg(x),Egg(x)]]");

  testEq(termToView(parse("(x x) (x x)"),[]).toString(),
         "Eggs[Egg(x),Egg(x),Eggs[Egg(x),Egg(x)]]");

  t = parse("λx.x");
  testEq(termToView(t,[]).toString(), "Awake(x,Egg(x))");
  testEq(termToView(t,[]).term, t);
  testEq(termToView(t,[]).child.term, [Var, 0]);

  testEq(termToView(parse("λx.x x"),[]).toString(),
         "Awake(x,Eggs[Egg(x),Egg(x)])");

  testEq(termToView(parse("(λx.x) x"),[]).toString(),
         "Eggs[Awake(x,Egg(x)),Egg(x)]");
}
