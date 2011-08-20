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

// ---------- Term Structure ----------
// ["var", idx] -- idx is a Bruijn index (bound) or string (unbound)
// ["abs", string, term] -- string is a hint of the variable name
// ["app", term, term]

// ---------- Evaluator ----------

function termEval(term) {
//  out(show(term, []));
  while (term[0] == "app") {
    var func = termEval(term[1]);
    var arg = termEval(term[2]);
    term = termSbstTop(func, arg);
//    out(show(term, []));
  }
  return term;
}

function termSbstTop(func, arg) {
  if (func[0] != "abs") return ["app", func, arg];
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
  case "var":
    var index = term[1];
    if (typeof index == "string") return term;       // constant
    if (index >= cut) return ["var", index + depth]; // unbound
    else return term;                                // bound
  case "abs":
    return ["abs", term[1], termShift(depth, cut + 1, term[2])];
  case "app":
    return ["app", termShift(depth, cut, term[1]), termShift(depth, cut, term[2])];
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
  case "var":
    var index = term[1];
    if (typeof index == "string") return term; // constant
    if (index == j) return arg;                // matched
    else return term;                          // unmatched
  case "abs":
    return ["abs", term[1], termSbst(j + 1, termShift(1, 0, arg), term[2])];
  case "app":
    return ["app", termSbst(j, arg, term[1]), termSbst(j, arg, term[2])];
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
  case "var":
    if (typeof term[1] == "number" && term[1] < ctx.length) return ctx[term[1]];
    if (typeof term[1] == "number") return "?" + term[1];
    return term[1];
  case "abs":
    var pair = pickFreshName(ctx, term[1]);
    return "(λ" + pair[1] + "." + show(term[2], pair[0]) + ")";
  case "app":
    return "(" + show(term[1], ctx) + " " + show(term[2], ctx) + ")";
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
  return parseTerm(source, [])[1];
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

// name = [a-z]
function parseName(source, ctx) {
  var match = parseRegExp(/^([a-z])\s*/)(source, ctx);
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
  return [true, ["var", idx], match[2]];
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
  return parseAppLeft(["app", first, second], rest.slice(1));
}

// abs = "\|L|λ|" name "." term
function parseAbs(source, ctx) {
  var result = seq(parseRegExp(/^([\\Lλ])\s*/),
                   parseName)(source, ctx);
  if (!result[0]) return [false];
  var newCtx = [result[1][1]].concat(ctx);
  var result2 = seq(parseRegExp(/^(\.)\s*/),
                    parseTerm)(result[2], newCtx);
  if (!result2[0]) return [false];
  return [true, ["abs", result[1][1], result2[1][1]], result2[2]];
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
  if (a.constructor != Array || b.constructor != Array) return false;
  if (a.length != b.length) return false;
  for (var i= 0; i < b.length; i++) {
    if (!eq(a[i], b[i])) return false;
  }
  return true;
}

function testEq(a, b) {
  if (eq(a, b)) return out("success");
  else out("expect: " + b + " but: " + a);
    console.log("expect: ", b, " but: ", a);
}

function runtest() {
  out("-- shift test --");
  testEq(termShift(1, 1, ["var", 1]), ["var", 2]);
  testEq(termShift(1, 2, ["var", 1]), ["var", 1]);
  testEq(termShift(1, 0, ["abs", "x", ["var", 1]]),
                         ["abs", "x", ["var", 2]]);
  testEq(termShift(1, 1, ["abs", "x", ["var", 1]]),
                         ["abs", "x", ["var", 1]]);
  testEq(termShift(1, 1, ["app", ["var", 0], ["var", 1]]),
                         ["app", ["var", 0], ["var", 2]]);
  testEq(termShift(1, 1, ["abs", "x", ["app", ["var", 1], ["var", 2]]]),
                         ["abs", "x", ["app", ["var", 1], ["var", 3]]]);

  out("-- substitution test --");
  testEq(termSbst(0, ["var", 1], ["var", 0]), ["var", 1]);
  testEq(termSbst(2, ["var", "a"], ["var", 2]), ["var", "a"]);

  testEq(termSbst(0, ["var", "a"], ["abs", "x", ["var", 1]]),
                                   ["abs", "x", ["var", "a"]]);

  testEq(termSbst(1, ["var", "a"], ["app", ["var", 0], ["var", 1]]),
                     ["app", ["var", 0], ["var", "a"]]);

  out("-- eval test --");
  testEq(termEval(["var", 1]), ["var", 1]);
  testEq(termEval(["abs", "x", ["var", 1]]), ["abs", "x", ["var", 1]]);

  testEq(termEval(["app", ["abs", "x", ["var", 0]], ["var", "y"]]),
                  ["var", "y"]);

  testEq(termEval(parse("(λx.λy.x) a b")), ["var", "a"]);
  testEq(termEval(parse("(λx.λy.y) a b")), ["var", "b"]);

  out("-- parser test --");
  testEq(parseVar("a!", ["a"]), [true, ["var", 0], "!"]);
  testEq(parseVar("b!", ["a"]), [true, ["var", "b"], "!"]);

  testEq(parsePrim("a!", ["a"]), [true, ["var", 0], "!"]);
  testEq(many(parseVar)("aaa!", ["a"]), [true, [["var", 0], ["var", 0], ["var", 0]] , "!"]);

  testEq(parseAppLeft(1, [2, 3, 4]), ["app", ["app", ["app", 1, 2], 3], 4]);

  testEq(parseApp("x y!", ["x", "y"]), [true, ["app", ["var", 0],
                                                      ["var", 1]], "!"]);

  testEq(parseAbs("\\x. y!", ["y"]), [true, ["abs", "x", ["var", 1]], "!"]);

  testEq(parseAbs("\\x.\\y. y x!"),
         [true, ["abs", "x", ["abs", "y", ["app", ["var", 0], ["var", 1]]]], "!"]);

  testEq(parseParen("(a)!", ["a"]), [true, ["var", 0], "!"]);

  testEq(parseApp("a (b c)!", ["a", "b"]),
         [true, ["app", ["var", 0], ["app", ["var", 1], ["var", "c"]]], "!"]);

  out("-- output test --");

  testEq(pickFreshName([], "a"), [["a"], "a"]);
  testEq(pickFreshName(["a1", "a"], "a"), [["a2", "a1", "a"], "a2"]);

  testEq(show(["var", 1], ["a", "b"]), "b");
  testEq(show(["var", "c"], ["a", "b"]), "c");

  testEq(show(["abs", "x", ["var", 1]], ["y"]),
         "(λx.y)");

  testEq(show(["app", ["var", 0], ["app", ["var", 1], ["var", 2]]], ["a", "b", "c"]), "(a (b c))");

  testEq(show(parseTerm("λf.λx.x")[1], []), "(λf.(λx.x))");
  testEq(show(parseTerm("λf.λx.f (f (f x))")[1], []), "(λf.(λx.(f (f (f x)))))");

  testEq(show(parseTerm("λg.(λx.g (x x)) (λx.g (x x))")[1], []),
         "(λg.((λx.(g (x x))) (λx.(g (x x)))))");

}

// For debug: run test cases when it is run with node.js.
if ((function(){return this;})()["process"] != undefined) {
  out = console.log;
  runtest();
}
