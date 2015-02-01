
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


var tests = [
  { name: 'test flags', f: test_flag }
];

tests.forEach(function(test) {
  console.log('Running ' + test.name);
  var f = test.f;
  f();
});
