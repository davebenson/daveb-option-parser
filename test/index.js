
var OptionParser = require('../lib/index').OptionParser;
var assert = require('assert');

var errorHandler_ignore = function() {};
var errorHandler_print = function(s) {console.log('ERROR: '+s);};

function test_flag()
{
  var o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
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
  o.errorHandler = errorHandler_ignore;
  o.addInt('num1', 'number 1').setMandatory();
  o.addInt('num2', 'number 2').setDefaultValue(42);
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

function test_string()
{
  var o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addString('animal', 'something that walks').setMandatory();
  o.addString('vegetable', 'somethng that grows from ground').setDefaultValue("potato");
  o.addString('mineral', 'something chthonic');
  var res1 = o.parse(['node', 'test', '--animal=dog']);
  assert(res1.animal === 'dog');
  assert(res1.vegetable === 'potato');
  assert(res1.mineral === undefined);
  var res2 = o.parse(['node', 'test']);
  assert(res2 === null);  // missing mandatory
  var res3 = o.parse(['node', 'test', '--animal=cat', '--vegetable' ,'cucumber', '--mineral=iron']);
  assert(res3.animal === 'cat');
  assert(res3.vegetable === 'cucumber');
  assert(res3.mineral === 'iron');
}

function test_float()
{
  var o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addFloat('num1', 'number 1').setMandatory();
  o.addFloat('num2', 'number 2').setDefaultValue(42);
  o.addFloat('num3', 'number 3');
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
  var res4 = o.parse(['node', 'test', '--num1=NaN']);
  assert(res4 === null);  // NaN not allowed
  var res5 = o.parse(['node', 'test', '--num1=dog']);
  assert(res5 === null);  // not-a-number
}

function test_type_registration()
{
  var o = new OptionParser();
  o.errorHandler = errorHandler_print;
  o.registerType('vector', function (value) {
    var rv = [];
    value.split(/,/).forEach(function(eltString) {
      var n = parseFloat(eltString);
      if (isNaN(n))
        throw new Error('error parsing element ' + (rv.length) + ' of vector (element was "' + eltString + '")');
      rv.push(n);
    });
    return rv;
  });
  o.addGeneric('a', 'vector', 'first vector').setMandatory();
  o.addGeneric('b', 'vector', 'second vector').setDefaultValue([1,2]);
  o.addGeneric('c', 'vector', 'third vector');

  var res1 = o.parse(['node', 'test', '--a=1,2,3']);
  assert(res1.a.length === 3);
  assert(res1.a[0] === 1);
  assert(res1.a[1] === 2);
  assert(res1.a[2] === 3);
  assert(res1.b.length === 2);
  assert(res1.b[0] === 1);
  assert(res1.b[1] === 2);
  assert(res1.c === undefined);
}

var tests = [
  { name: 'test flags', f: test_flag },
  { name: 'test ints', f: test_int },
  { name: 'test strings', f: test_string },
  { name: 'test floats', f: test_float },
  { name: 'test type registration', f: test_type_registration },
];

tests.forEach(function(test) {
  console.log('Running ' + test.name);
  var f = test.f;
  f();
});
