// lambda.js : A lambda calculator
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

// ---------- Printer ----------

function show(node) {
  switch (node[0]) {
  case "var":
    return node[1];
  case "abs":
    return "(λ" + show(node[1]) + "." + show(node[2]) + ")";
  case "app":
    return "(" + show(node[1]) + " " + show(node[2]) + ")";
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
function parseTerm(source) {
  return parseApp(source);
}

// prim = paren | abs | var
function parsePrim(source) {
  return orElse(parseParen,
         orElse(parseAbs,
                parseVar))(source);
}

// var = [a-z]
function parseVar(source) {
  var match = parseRegExp(/^([a-z])\s*/)(source);
  if (!match[0]) return [false];
  return [true, ["var", match[1]], match[2]];
}

// app = prim prim*
function parseApp(source) {
  var result = seq(parsePrim,
               many(parsePrim))(source);
  if (!result[0]) return [false];
  var newTree= parseAppLeft(result[1][0], result[1][1]);
  return [true, newTree, result[2]];
}

function parseAppLeft(first, rest) {
  if (rest.length == 0) return first;
  var second= rest[0];
  return parseAppLeft(["app", first, second], rest.slice(1));
}

// abs = "\|L|λ|" var "." term
function parseAbs(source) {
  var result = seq(parseRegExp(/^([\\Lλ])\s*/),
               seq(parseVar,
               seq(parseRegExp(/^(\.)\s*/),
                   parseTerm)))(source);
  if (!result[0]) return [false];
  return [true, ["abs", result[1][1][0], result[1][1][1][1]], result[2]];
}

// paren = ( term )
function parseParen(source) {
  var result= seq(parseRegExp(/^\(\s*/),
              seq(parseTerm,
                  parseRegExp(/^\)\s*/)))(source);
  if (!result[0]) return [false];
  return [true, result[1][1][0], result[2]];
}

// Return a parser which accept with the regular expression.
// The parser returns [true, first matched element, rest of the input]
function parseRegExp(regExp) {
  return function(source) {
    var match= regExp.exec(source);
    if (match) return [true, match[1], source.slice(match[0].length)];
    return [false];
  };
}

// ---------- Combinator Parser Library ----------

// Return a list of values using parser until it fails.
function many(parser) {
  return function(source) {
    var result= [];
    while (true) {
      var each= parser(source);
      if (!each[0]) return [true, result, source];
      result.push(each[1]);
      source= each[2];
    }
  };
}

// If parser1 fails then parse2.
function orElse(parser1, parser2) {
  return function(source) {
    var first= parser1(source);
    if (first[0]) return first;
    return parser2(source);
  };
}

// Do parse1 and parse2 and return list of results.
function seq(parser1, parser2) {
  return function(source) {
    var first= parser1(source);
    if (!first[0]) return [false];
    var second= parser2(first[2]);
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
  testEq(parseVar("a!"), [true, ["var", "a"], "!"]);
  testEq(parsePrim("a!"), [true, ["var", "a"], "!"]);
  testEq(many(parseVar)("aaa!"), [true, [["var", "a"], ["var", "a"], ["var", "a"]] , "!"]);

  testEq(parseAppLeft(1, [2, 3, 4]), ["app", ["app", ["app", 1, 2], 3], 4]);

  testEq(parseApp("x y!"), [true, ["app", ["var", "x"],
                                          ["var", "y"]], "!"]);

  testEq(parseAbs("\\x. y!"), [true, ["abs", ["var", "x"],
                                             ["var", "y"]], "!"]);

  testEq(parseAbs("\\x.\\y. y x!"),
         [true, ["abs", ["var", "x"],
                        ["abs", ["var", "y"],
                                ["app", ["var", "y"], ["var", "x"]]]], "!"]);

  testEq(parseParen("(a)!"), [true, ["var", "a"], "!"]);

  testEq(parseApp("a (b c)!"),
         [true, ["app", ["var", "a"], ["app", ["var", "b"], ["var", "c"]]], "!"]);

  out("-- output test --");

  testEq(show(["var", "a"]), "a");
  testEq(show(["abs", ["var", "x"],
                      ["var", "y"]]),
         "(λx.y)");

  testEq(show(["app", ["var", "a"], ["app", ["var", "b"], ["var", "c"]]]), "(a (b c))");

  testEq(show(parseTerm("λf.λx.x")[1]), "(λf.(λx.x))");
  testEq(show(parseTerm("λf.λx.f (f (f x))")[1]), "(λf.(λx.(f (f (f x)))))");

  testEq(show(parseTerm("λg.(λx.g (x x)) (λx.g (x x))")[1]),
         "(λg.((λx.(g (x x))) (λx.(g (x x)))))");

}
