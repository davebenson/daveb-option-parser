
var OptionParser = require('../lib/index').OptionParser;
var assert = require('assert');


function test_flag()
{
  var o = new OptionParser();
  o.errorHandler = function() {};
  o.addFlag('flag', 'this is a flag');
  var res1 = o.parse(['node', 'test', '--stupid']);
  assert(!res1);
  var res2 = o.parse(['node', 'test']);
  assert(res2);
  assert(!res2.flag);
  var res3 = o.parse(['node', 'test', '--flag']);
  assert(res3);
  assert(res3.flag);
  var res4 = o.parse(['node', 'test', '--no-flag']);
  assert(res4);
  assert(!res4.flag);
}

function test_int()
{
  var o = new OptionParser();
  o.errorHandler = function() {};
  o.addInt('num1', 'number 1').mandatory();
  o.addInt('num2', 'number 2').defaultValue(42);
  o.addInt('num3', 'number 3');
  var res1 = o.parse(['node', 'test', '--num1=0']);
  assert(res1.num1 === 0);
  assert(res1.num2 === 42);
  assert(res1.num3 === undefined);
  var res2 = o.parse(['node', 'test']);
  assert(res2 === null);  // missing mandatory
  var res3 = o.parse(['node', 'test', '--num1=1', '--num2=-666', '--num3=111']);
  assert(res3.num1 === 1);
  assert(res3.num2 === -666);
  assert(res3.num3 === 111);
}

var tests = [
  { name: 'test flags', f: test_flag },
  { name: 'test ints', f: test_int },
];

tests.forEach(function(test) {
  console.log('Running ' + test.name);
  var f = test.f;
  f();
});
