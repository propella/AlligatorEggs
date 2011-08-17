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

// ---------- Printer ----------

function pickFreshName(env, name) {
  var trunk = /^[a-z]+/.exec(name);
  var found = env.filter(
    function(each) {
      var eachTrunk = /^[a-z]+/.exec(each)[0];
      return trunk == eachTrunk; }).length;
  var newName = found == 0 ? name : name + found;
  return [[newName].concat(env), newName];
}

function show(node, env) {
  switch (node[0]) {
  case "var":
    if (typeof node[1] == "number") return env[node[1]];
    return node[1];
  case "abs":
    var pair = pickFreshName(env, node[1]);
    return "(λ" + pair[1] + "." + show(node[2], pair[0]) + ")";
  case "app":
    return "(" + show(node[1], env) + " " + show(node[2], env) + ")";
  }
  throw	"unknown tag:" + node[0];
}

// ---------- Reader ----------

// All parsers have same signature:
//
// argument     String
// return value [true, parsed tree, rest of source]
//           or [false] if failed

// term = app
function parseTerm(source, env) {
  return parseApp(source, env);
}

// prim = paren | abs | var
function parsePrim(source, env) {
  return orElse(parseParen,
         orElse(parseAbs,
                parseVar))(source, env);
}

// name = [a-z]
function parseName(source, env) {
  var match = parseRegExp(/^([a-z])\s*/)(source, env);
  if (!match[0]) return [false];
  return [true, match[1], match[2]];
}

// var = name
function parseVar(source, env) {
  var match = parseName(source, env);
  if (!match[0]) return [false];
  var idx = env.indexOf(match[1]);
  if (idx == -1) {
    idx = match[1];
  }
  return [true, ["var", idx], match[2]];
}

// app = prim prim*
function parseApp(source, env) {
  var result = seq(parsePrim,
                   many(parsePrim))(source, env);
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
function parseAbs(source, env) {
  var result = seq(parseRegExp(/^([\\Lλ])\s*/),
                   parseName)(source, env);
  if (!result[0]) return [false];
  var newEnv = [result[1][1]].concat(env);
  var result2 = seq(parseRegExp(/^(\.)\s*/),
                    parseTerm)(result[2], newEnv);
  if (!result2[0]) return [false];
  return [true, ["abs", result[1][1], result2[1][1]], result2[2]];
}

// paren = ( term )
function parseParen(source, env) {
  var result= seq(parseRegExp(/^\(\s*/),
              seq(parseTerm,
                  parseRegExp(/^\)\s*/)))(source, env);
  if (!result[0]) return [false];
  return [true, result[1][1][0], result[2]];
}

// Return a parser which accept with the regular expression.
// The parser returns [true, first matched element, rest of the input]
function parseRegExp(regExp) {
  return function(source, env) {
    var match= regExp.exec(source);
    if (match) return [true, match[1], source.slice(match[0].length)];
    return [false];
  };
}

// ---------- Combinator Parser Library ----------

// Return a list of values using parser until it fails.
function many(parser) {
  return function(source, env) {
    var result= [];
    while (true) {
      var each= parser(source, env);
      if (!each[0]) return [true, result, source];
      result.push(each[1]);
      source= each[2];
    }
  };
}

// If parser1 fails then parse2.
function orElse(parser1, parser2) {
  return function(source, env) {
    var first= parser1(source, env);
    if (first[0]) return first;
    return parser2(source, env);
  };
}

// Do parse1 and parse2 and return list of results.
function seq(parser1, parser2) {
  return function(source, env) {
    var first= parser1(source, env);
    if (!first[0]) return [false];
    var second= parser2(first[2], env);
    if (!second[0]) return [false];
    return [true, [first[1], second[1]], second[2]];
  };
}

// ---------- Test ----------

// Equality check for unit test.
function eq(a, b) {
  if (a == b) return true;
  if (a == undefined || b == undefined) return false;
  if (a.constructor != Array) return false;
  if (b.constructor != Array) return false;
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
