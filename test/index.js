
var OptionParser = require('../lib/daveb-option-parser').OptionParser;
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
  var res5 = o.parse(['node', 'test', '--flag=true']);
  assert(res5);
  assert(res5.flag);
  var res6 = o.parse(['node', 'test', '--flag=false']);
  assert(res6);
  assert(!res6.flag);
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
  o.errorHandler = errorHandler_ignore;
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
 
function test_int_repeated()
{
  var o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addGeneric('a', 'int', 'first vector').setMandatory().setRepeated();
  o.addGeneric('b', 'int', 'second vector').setDefaultValue([1,2]).setRepeated();
  o.addGeneric('c', 'int', 'third vector').setRepeated();

  var res1 = o.parse(['node', 'test', '--a=1', '--a', '2']);
  assert(res1.a.length === 2);
  assert(res1.a[0] === 1);
  assert(res1.a[1] === 2);
  assert(res1.b.length === 2);
  assert(res1.b[0] === 1);
  assert(res1.b[1] === 2);
  assert(res1.c.length === 0);

  var res2 = o.parse(['node', 'test']);
  assert(res2 === null);

  var res3 = o.parse(['node', 'test', '--a=666', '--b=42', '--c', '7', '--c=9', '--c=11', '--c=13']);
  assert(res3.a.length === 1);
  assert(res3.a[0] === 666);
  assert(res3.b.length === 1);
  assert(res3.b[0] === 42);
  assert(res3.c.length === 4);
  assert(res3.c[0] === 7);
  assert(res3.c[1] === 9);
  assert(res3.c[2] === 11);
  assert(res3.c[3] === 13);
}

function test_modes()
{
  var o_rectangle = new OptionParser();
  o_rectangle.errorHandler = errorHandler_ignore;
  o_rectangle.addFloat('width', 'width of rectangle').setMandatory();
  o_rectangle.addFloat('height', 'height of rectangle').setMandatory();

  var o_circle = new OptionParser();
  o_circle.errorHandler = errorHandler_ignore;
  o_circle.addFloat('radius', 'radius of circle').setMandatory();

  var o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addMode('rectangle', o_rectangle);
  o.addMode('circle', o_circle);
  var res1 = o.parse(['node', 'test', 'circle', '--radius=5']);
  assert(res1.mode === 'circle');
  assert(res1.modeValues.radius === 5);

  var res2 = o.parse(['node', 'test', '--radius=5']);
  assert(res2 === null);

  var res3 = o.parse(['node', 'test']);
  assert(res3 === null);

  var res4 = o.parse(['node', 'test', 'circle', '--radiusx=5']);
  assert(res4 === null);

  var res5 = o.parse(['node', 'test', 'rectangle', '--width=42', '--height=24']);
  assert(res5.mode === 'rectangle');
  assert(res5.modeValues.width === 42);
  assert(res5.modeValues.height === 24);
}

function test_single_character_flags()
{
  var o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addFlag('flag-a', 'a flag');
  o.addFlag('flag-b', 'b flag');
  o.addShortAlias('g', 'flag-a');
  o.addShortAlias('h', 'flag-b');

  var res1 = o.parse(['node', 'test', '--flag-a']);
  assert(res1.flagA);
  assert(!res1.flagB);

  var res2 = o.parse(['node', 'test', '--flag-b']);
  assert(!res2.flagA);
  assert(res2.flagB);
  
  var res3 = o.parse(['node', 'test', '-g']);
  assert(res3.flagA);
  assert(!res3.flagB);

  var res4 = o.parse(['node', 'test', '-h']);
  assert(!res4.flagA);
  assert(res4.flagB);

  var res5 = o.parse(['node', 'test', '-gh']);
  assert(res5.flagA);
  assert(res5.flagB);
  
  var res6 = o.parse(['node', 'test', '-hg']);
  assert(res6.flagA);
  assert(res6.flagB);
}

function test_single_character_string_int_options()
{
  var o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addInt('a', 'a flag');
  o.addString('b', 'b flag');
  o.addShortAlias('g', 'a');
  o.addShortAlias('h', 'b');

  var res1 = o.parse(['node', 'test', '-gh', '42', '43']);
  assert(typeof(res1.a) === 'number');
  assert(typeof(res1.b) === 'string');
  assert(res1.a === 42);
  assert(res1.b === '43');

  var res2 = o.parse(['node', 'test', '-hg', '42', '43']);
  assert(typeof(res2.a) === 'number');
  assert(typeof(res2.b) === 'string');
  assert(res2.a === 43);
  assert(res2.b === '42');
}

function test_wrapper()
{
  var o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addInt('a', 'a int');
  o.addFlag('b', 'b');
  var res1 = o.parse(['node', 'test', 'subprogram', '--c']);
  assert(res1 === null);

  var res2 = o.parse(['node', 'test', 'subprogram', '--b']);
  assert(res2 !== null);
  assert(res2.b);
  assert(o.arguments.length === 1);
  assert(o.arguments[0] === 'subprogram');

  o.setWrapper();

  var res3 = o.parse(['node', 'test', 'subprogram', '--c', '--b']);
  assert(!res3.b);
  assert(o.arguments.length === 3);
  assert(o.arguments[0] === 'subprogram');
  assert(o.arguments[1] === '--c');
  assert(o.arguments[2] === '--b');
}

var tests = [
  { name: 'test flags', f: test_flag },
  { name: 'test ints', f: test_int },
  { name: 'test strings', f: test_string },
  { name: 'test floats', f: test_float },
  { name: 'test type registration', f: test_type_registration },
  { name: 'test repeated ints', f: test_int_repeated },
  { name: 'test modes', f: test_modes },
  { name: 'test single character flags', f: test_single_character_flags },
  { name: 'test single character string/int options', f: test_single_character_string_int_options },
  { name: 'test wrapper', f: test_wrapper },
];

tests.forEach(function(test) {
  console.log('Running ' + test.name);
  var f = test.f;
  f();
});
