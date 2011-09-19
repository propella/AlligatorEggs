// lambda.js : A lambda calculator -*- coding: utf-8 -*-
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

function getQuery() {
  var query = window.location.hash;
  var match = /^#!\/(.*)/.exec(query);
  if (!match) return "";
  return decodeURIComponent(match[1]);
}


// ---------- Term Structure ----------
// [Var, idx] -- idx is a Bruijn index (bound) or string (unbound)
// [Abs, string, term] -- string is a hint of the variable name
// [App, term, term]

var Var = "var";
var Abs = "abs";
var App = "app";

// ---------- Evaluator ----------

function termEval(term) {
  out(show(term, []));
  for (var i = 0; i < 30; i++) {
    var newTerm = eval1(term);
    if (newTerm == null) return term;
    term = newTerm;
    out(show(term, []));
  }
  out("...");
  return null;
}

// Eval one step.
// Return null if no further steps are present.
function eval1(term) {
  switch (term[0]) {
  case Var:
    return null;
  case Abs:
    var body = eval1(term[2]);
    if (body == null) return null;
    else return [Abs, term[1], body];
  case App:
    var func = eval1(term[1]);
    if (func != null) return [App, func, term[2]];
    var arg = eval1(term[2]);
    if (arg != null) return [App, term[1], arg];

    return termSbstTop(term[1], term[2]);
  }
  throw "unknown tag:" + term[0];
}

// Find an application to be evaluated
// Return null if no further steps are present.
function findApp(term) {
  switch (term[0]) {
  case Var:
    return null;
  case Abs:
    return findApp(term[2]);
  case App:
    var func = findApp(term[1]);
    if (func != null) return func;
    var arg = findApp(term[2]);
    if (arg != null) return arg;
    if (term[1][0] != Abs) return null;
    return term;
  }
  throw "unknown tag:" + term[0];
}

function termSbstTop(func, arg) {
  if (func[0] != Abs) return null;
  var term = func[2];
  return termShift(-1, 0, termSbst(0, termShift(1, 0, arg), term));
}

// TermShift switches the context of the term.
// depth is 1 (jump into lambda) or -1 (escape from lambda)
// cut is current lambda level.
//
// when depth = 1, cut = 0: λ. 1 2 => λ. 2 3
// when depth = 1, cut = 1: λ. 1 2 => λ. 1 3

function termShift(depth, cut, term) {
  switch (term[0]) {
  case Var:
    var index = term[1];
    if (typeof index == "string") return term;       // constant
    if (index >= cut) return [Var, index + depth]; // unbound
    else return term;                                // bound
  case Abs:
    return [Abs, term[1], termShift(depth, cut + 1, term[2])];
  case App:
    return [App, termShift(depth, cut, term[1]), termShift(depth, cut, term[2])];
  }
  throw	"unknown tag:" + term[0];
}

// Substitution
//
// [j -> arg] term     = arg   if term = j
//                     | term  otherwise other
// [j -> arg] (λ.term) = λ. [j+1 -> termShift(1, 0, arg)] term
// [j -> arg] t1 t2    = [j -> arg] t1 [j -> arg t2

function termSbst(j, arg, term) {
  switch (term[0]) {
  case Var:
    var index = term[1];
    if (typeof index == "string") return term; // constant
    if (index == j) return arg;                // matched
    else return term;                          // unmatched
  case Abs:
    return [Abs, term[1], termSbst(j + 1, termShift(1, 0, arg), term[2])];
  case App:
    return [App, termSbst(j, arg, term[1]), termSbst(j, arg, term[2])];
  }
  throw	"unknown tag:" + term[0];
}

// ---------- Printer ----------

function pickFreshName(ctx, name) {
  var trunk = /^[a-z]+/.exec(name);
  var found = ctx.filter(
    function(each) {
      var eachTrunk = /^[a-z]+/.exec(each)[0];
      return trunk == eachTrunk; }).length;
  var newName = found == 0 ? name : name + found;
  return [[newName].concat(ctx), newName];
}

function show(term, ctx) {
  switch (term[0]) {
  case Var:
    if (typeof term[1] == "number" && term[1] < ctx.length) return ctx[term[1]];
    if (typeof term[1] == "number") return "?" + term[1];
    return term[1];
  case Abs:
    var pair = pickFreshName(ctx, term[1]);
    return "λ" + pair[1] + "." + show(term[2], pair[0]);
  case App:
    // You can reduce further in case of "x λx.x", but I omit for sake of simplicity.
    var t1 = term[1];
    var t2 = term[2];
    var show1 = show(t1, ctx);
    var show2 = show(t2, ctx);
    if (t1[0] == Abs && t2[0] == App) return "(" + show1 + ") (" + show2 + ")";
    if (t1[0] == Abs && t2[0] == Abs) return "(" + show1 + ") (" + show2 + ")";
    if (t1[0] == Abs)                 return "(" + show1 + ") "  + show2;
    if (t2[0] == App)                 return       show1  + " (" + show2 + ")";
    if (t2[0] == Abs)                 return show1        + " (" + show2 + ")";
                                      return show1         + " " + show2;
  }
  throw	"unknown tag:" + term[0];
}

// ---------- Reader ----------

// All parsers have same signature:
//
// argument     String
// return value [true, parsed tree, rest of source]
//           or [false] if failed

function parse(source) {
  var match = parseTerm(source, []);
  if (!match[0]) return null;
  return match[1];
}

// term = app
function parseTerm(source, ctx) {
  return parseApp(source, ctx);
}

// prim = paren | abs | var
function parsePrim(source, ctx) {
  return orElse(parseParen,
         orElse(parseAbs,
                parseVar))(source, ctx);
}

// name = [a-z][A-Z][0-9]
function parseName(source, ctx) {
  var match = parseRegExp(/^([a-zA-Z0-9]+)\s*/)(source, ctx);
  if (!match[0]) return [false];
  return [true, match[1], match[2]];
}

// var = name
function parseVar(source, ctx) {
  var match = parseName(source, ctx);
  if (!match[0]) return [false];
  var idx = ctx.indexOf(match[1]);
  if (idx == -1) {
    idx = match[1];
  }
  return [true, [Var, idx], match[2]];
}

// app = prim prim*
function parseApp(source, ctx) {
  var result = seq(parsePrim,
                   many(parsePrim))(source, ctx);
  if (!result[0]) return [false];
  var newTree= parseAppLeft(result[1][0], result[1][1]);
  return [true, newTree, result[2]];
}

function parseAppLeft(first, rest) {
  if (rest.length == 0) return first;
  var second= rest[0];
  return parseAppLeft([App, first, second], rest.slice(1));
}

// abs = ("λ" | "\" | "L") name "." term
function parseAbs(source, ctx) {
  var result = seq(parseRegExp(/^([\\Lλ])\s*/),
                   parseName)(source, ctx);
  if (!result[0]) return [false];
  var newCtx = [result[1][1]].concat(ctx);
  var result2 = seq(parseRegExp(/^(\.)\s*/),
                    parseTerm)(result[2], newCtx);
  if (!result2[0]) return [false];
  return [true, [Abs, result[1][1], result2[1][1]], result2[2]];
}

// paren = ( term )
function parseParen(source, ctx) {
  var result= seq(parseRegExp(/^\(\s*/),
              seq(parseTerm,
                  parseRegExp(/^\)\s*/)))(source, ctx);
  if (!result[0]) return [false];
  return [true, result[1][1][0], result[2]];
}

// Return a parser which accept with the regular expression.
// The parser returns [true, first matched element, rest of the input]
function parseRegExp(regExp) {
  return function(source, ctx) {
    var match= regExp.exec(source);
    if (match) return [true, match[1], source.slice(match[0].length)];
    return [false];
  };
}

// ---------- Combinator Parser Library ----------

// Return a list of values using parser until it fails.
function many(parser) {
  return function(source, ctx) {
    var result= [];
    while (true) {
      var each= parser(source, ctx);
      if (!each[0]) return [true, result, source];
      result.push(each[1]);
      source= each[2];
    }
  };
}

// If parser1 fails then parse2.
function orElse(parser1, parser2) {
  return function(source, ctx) {
    var first= parser1(source, ctx);
    if (first[0]) return first;
    return parser2(source, ctx);
  };
}

// Do parse1 and parse2 and return list of results.
function seq(parser1, parser2) {
  return function(source, ctx) {
    var first= parser1(source, ctx);
    if (!first[0]) return [false];
    var second= parser2(first[2], ctx);
    if (!second[0]) return [false];
    return [true, [first[1], second[1]], second[2]];
  };
}

// ---------- Test ----------

// Equality check for unit test.
function eq(a, b) {
  if (a == b) return true;
  if (a == undefined || b == undefined) return false;
  if (a.constructor == Array && b.constructor == Array) {
    if (a.length != b.length) return false;
    for (var i= 0; i < b.length; i++) {
      if (!eq(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a == "object" && a.constructor == b.constructor) {
    for (var i in a) {
      if (!eq(a[i], b[i])) return false;
    }
    return true;
  }
  return false;
}

function testEq(a, b) {
  if (eq(a, b)) {
    out("success");
  } else {
    out("expect: " + b + " but: " + a);
    console.log(["expect: ", b, " but: ", a]);
  }
  return;
}

function runtest() {
  out("-- find app test --");
  testEq(findApp(parse("x")), null);
  testEq(findApp(parse("x x")), null);
  testEq(findApp(parse("x.x")), null);
  testEq(findApp(parse("(λx.x) x")), parse("(λx.x) x"));
  testEq(findApp(parse("λx.(λy.y) x")), parseTerm("(λy.y) x", ["x"])[1]);

  out("-- shift test --");
  testEq(termShift(1, 1, [Var, 1]), [Var, 2]);
  testEq(termShift(1, 2, [Var, 1]), [Var, 1]);
  testEq(termShift(1, 0, [Abs, "x", [Var, 1]]),
                         [Abs, "x", [Var, 2]]);
  testEq(termShift(1, 1, [Abs, "x", [Var, 1]]),
                         [Abs, "x", [Var, 1]]);
  testEq(termShift(1, 1, [App, [Var, 0], [Var, 1]]),
                         [App, [Var, 0], [Var, 2]]);
  testEq(termShift(1, 1, [Abs, "x", [App, [Var, 1], [Var, 2]]]),
                         [Abs, "x", [App, [Var, 1], [Var, 3]]]);

  out("-- substitution test --");
  testEq(termSbst(0, [Var, 1], [Var, 0]), [Var, 1]);
  testEq(termSbst(2, [Var, "a"], [Var, 2]), [Var, "a"]);

  testEq(termSbst(0, [Var, "a"], [Abs, "x", [Var, 1]]),
                                   [Abs, "x", [Var, "a"]]);

  testEq(termSbst(1, [Var, "a"], [App, [Var, 0], [Var, 1]]),
                     [App, [Var, 0], [Var, "a"]]);

  out("-- eval test --");
  testEq(termEval([Var, 1]), [Var, 1]);
  testEq(termEval([Abs, "x", [Var, 1]]), [Abs, "x", [Var, 1]]);

  testEq(termEval([App, [Abs, "x", [Var, 0]], [Var, "y"]]),
                  [Var, "y"]);

  testEq(termEval(parse("(λx.λy.x) a b")), [Var, "a"]);
  testEq(termEval(parse("(λx.λy.y) a b")), [Var, "b"]);
  testEq(termEval(parse("(λx.λy. x y) (λz. z)")), parse("(λy.y)"));

  testEq(termEval(parse("λg.(λx.g (x x)) (λx.g (x x))")), null);

  testEq(termEval(parse("(λx.x x) (λx.x x)")), null);

  var two = parse("λf.λx.f (f x)");
  var three = parse("λf.λx.f (f (f x))");
  var five = parse("λf.λx.f (f (f (f (f x))))");
  var plus = parse("λm. λn. λf. λx. m f (n f x)");
  var succ = parse("λn. λf. λx. f (n f x)");

  testEq(termEval([App, succ, two]), three);

  testEq(termEval([App, [App, plus, two], three]), five);

  out("-- parser test --");
  testEq(parseVar("a!", ["a"]), [true, [Var, 0], "!"]);
  testEq(parseVar("b!", ["a"]), [true, [Var, "b"], "!"]);

  testEq(parsePrim("a!", ["a"]), [true, [Var, 0], "!"]);
  testEq(many(parseVar)("a a a!", ["a"]), [true, [[Var, 0], [Var, 0], [Var, 0]] , "!"]);

  testEq(parseAppLeft(1, [2, 3, 4]), [App, [App, [App, 1, 2], 3], 4]);

  testEq(parseApp("x y!", ["x", "y"]), [true, [App, [Var, 0],
                                                      [Var, 1]], "!"]);

  testEq(parseAbs("\\x. y!", ["y"]), [true, [Abs, "x", [Var, 1]], "!"]);

  testEq(parseAbs("\\x.\\y. y x!"),
         [true, [Abs, "x", [Abs, "y", [App, [Var, 0], [Var, 1]]]], "!"]);

  testEq(parseParen("(a)!", ["a"]), [true, [Var, 0], "!"]);

  testEq(parseApp("a (b c)!", ["a", "b"]),
         [true, [App, [Var, 0], [App, [Var, 1], [Var, "c"]]], "!"]);

  out("-- output test --");

  testEq(pickFreshName([], "a"), [["a"], "a"]);
  testEq(pickFreshName(["a1", "a"], "a"), [["a2", "a1", "a"], "a2"]);

  testEq(show([Var, 1], ["a", "b"]), "b");
  testEq(show([Var, "c"], ["a", "b"]), "c");

  testEq(show([Abs, "x", [Var, 1]], ["y"]), "λx.y");


  testEq(show([App, [Var, 0], [App, [Var, 1], [Var, 2]]], ["a", "b", "c"]), "a (b c)");

  testEq(show(parse("λf.λx.x"), []), "λf.λx.x");

  testEq(show(parse("(λx.x) (x x)"), []), "(λx.x) (x x)");
  testEq(show(parse("(λx.x) (λx.x)"), []), "(λx.x) (λx.x)");
  testEq(show(parse("(λx.x) x"), []), "(λx.x) x");
  testEq(show(parse("x x (x x)"), []), "x x (x x)");
  testEq(show(parse("x (x x)"), []), "x (x x)");
  testEq(show(parse("x x (λx.x)"), []), "x x (λx.x)");
  testEq(show(parse("x x x"), []), "x x x");
  testEq(show(parse("x (λx.x)"), []), "x (λx.x)");

  testEq(show(parse("λf.λx.f (f (f x))"), []), "λf.λx.f (f (f x))");

  testEq(show(parse("λg.(λx.g (x x)) (λx.g (x x))"), []),
         "λg.(λx.g (x x)) (λx.g (x x))");
}

// For debug: run test cases when it is run with node.js.
if ((function(){return this;})()["process"] != undefined) {
  out = console.log;
  runtest();
}
