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

// ---------- User Interface ----------

function out(aString) {
  var transcript = $("#transcript");
  transcript.text(transcript.text() + aString + "\r\n");
}

function showIt() {
  var expression = document.getElementById('exp').value;
  document.location.hash = "#!/" + encodeURIComponent(expression);
  var term = parse(expression);
TheTerm = term;
  if (!term) out("Syntax error");
  else showResult(term);
  return false;
}

function next () {
  if (!TheTerm) return;
  var view = TheView;
  var app = findApp(TheTerm);

  var appliedShape = view.findTerm(app);
  if (!appliedShape) return;


  appliedShape.animateEat(function() {
                            TheTerm = eval1(TheTerm);
                            if (TheTerm == null) return;
                            else showResult(TheTerm);
                          });
  appliedShape.animateHatch();
}

function auto () {
  if (!TheTerm) return;
  next();
  setTimeout(auto, 1000);
}

function showResult(term) {
  var view = termToView(term, []);
TheView = view;
  out(view);
  Shape.remove();
  view.show(0,0);
}


// ---------- Initialization ----------

$(function() {
  Shape.init($("#stage"));
  $("#stage > svg").attr("viewBox", "0 0 1600 1200");
  $("#enter").click(showIt);
  $("#next").click(next);
  $("#auto").click(auto);
  initExp();
  runViewTest();
});

function initExp() {
  var query= getQuery();
  if (query == "") return;
  $("#exp").val(query);
  setTimeout(showIt, 200); // for debug
}

window.onhashchange = initExp;

// ---------- View Data Structures ----------

var Egg = Shape.Egg;
var Eggs = Shape.Eggs;
var Awake = Shape.Awake;

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
