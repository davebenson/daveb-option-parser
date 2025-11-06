
import {TypeInfo, OptionParser} from '../lib/daveb-option-parser.js';
import assert from 'node:assert';
import util from 'node:util';
import test from 'node:test';

const errorHandler_ignore = s => {};
const errorHandler_print = s => console.log('ERROR: ' + s);

test('test flag arguments', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addFlag('flag', 'this is a flag');
  const res1 = o.parse(['node', 'test', '--stupid']);
  assert(!res1);
  const res2 = o.parse(['node', 'test']);
  assert(res2);
  assert(!res2.flag);
  const res3 = o.parse(['node', 'test', '--flag']);
  assert(res3);
  assert(res3.flag);
  const res4 = o.parse(['node', 'test', '--no-flag']);
  assert(res4);
  assert(!res4.flag);
  const res5 = o.parse(['node', 'test', '--flag=true']);
  assert(res5);
  assert(res5.flag);
  const res6 = o.parse(['node', 'test', '--flag=false']);
  assert(res6);
  assert(!res6.flag);
});

test('test int arguments', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addInt('num1', 'number 1').setMandatory();
  o.addInt('num2', 'number 2').setDefaultValue(42);
  o.addInt('num3', 'number 3');
  const res1 = o.parse(['node', 'test', '--num1=0']);
  assert(res1.num1 === 0);
  assert(res1.num2 === 42);
  assert(res1.num3 === undefined);
  const res2 = o.parse(['node', 'test']);
  assert(res2 === null);  // missing mandatory
  const res3 = o.parse(['node', 'test', '--num1=1', '--num2=-666', '--num3=111']);
  assert(res3.num1 === 1);
  assert(res3.num2 === -666);
  assert(res3.num3 === 111);
});

test('test string arguments', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addString('animal', 'something that walks').setMandatory();
  o.addString('vegetable', 'somethng that grows from ground').setDefaultValue("potato");
  o.addString('mineral', 'something chthonic');
  const res1 = o.parse(['node', 'test', '--animal=dog']);
  assert(res1.animal === 'dog');
  assert(res1.vegetable === 'potato');
  assert(res1.mineral === undefined);
  const res2 = o.parse(['node', 'test']);
  assert(res2 === null);  // missing mandatory
  const res3 = o.parse(['node', 'test', '--animal=cat', '--vegetable' ,'cucumber', '--mineral=iron']);
  assert(res3.animal === 'cat');
  assert(res3.vegetable === 'cucumber');
  assert(res3.mineral === 'iron');
});

test('test float arguments', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addFloat('num1', 'number 1').setMandatory();
  o.addFloat('num2', 'number 2').setDefaultValue(42);
  o.addFloat('num3', 'number 3');
  const res1 = o.parse(['node', 'test', '--num1=0']);
  assert(res1.num1 === 0);
  assert(res1.num2 === 42);
  assert(res1.num3 === undefined);
  const res2 = o.parse(['node', 'test']);
  assert(res2 === null);  // missing mandatory
  const res3 = o.parse(['node', 'test', '--num1=1', '--num2=-666', '--num3=111']);
  assert(res3.num1 === 1);
  assert(res3.num2 === -666);
  assert(res3.num3 === 111);
  const res4 = o.parse(['node', 'test', '--num1=NaN']);
  assert(res4 === null);  // NaN not allowed
  const res5 = o.parse(['node', 'test', '--num1=dog']);
  assert(res5 === null);  // not-a-number
});

function doParseFloat(s) {
  const rv = parseFloat(s);
  if (isNaN(rv))
    throw new Error('error parsing vector component');
  return rv;
}

class TypeInfoVector extends TypeInfo {
  constructor() {
    super('vector');
  }
  parse(value, values, argInfo) {
    return value.split(/,/).map(doParseFloat);
  }
}

test('type registration', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.registerType(new TypeInfoVector());
  o.addGeneric('a', 'vector', 'first vector').setMandatory();
  o.addGeneric('b', 'vector', 'second vector').setDefaultValue([1,2]);
  o.addGeneric('c', 'vector', 'third vector');

  const res1 = o.parse(['node', 'test', '--a=1,2,3']);
  assert(res1.a.length === 3);
  assert(res1.a[0] === 1);
  assert(res1.a[1] === 2);
  assert(res1.a[2] === 3);
  assert(res1.b.length === 2);
  assert(res1.b[0] === 1);
  assert(res1.b[1] === 2);
  assert(res1.c === undefined);
});
 
test('int repeated', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addGeneric('a', 'int', 'first vector').setMandatory().setRepeated();
  o.addGeneric('b', 'int', 'second vector').setDefaultValue([1,2]).setRepeated();
  o.addGeneric('c', 'int', 'third vector').setRepeated();

  const res1 = o.parse(['node', 'test', '--a=1', '--a', '2']);
  assert(res1.a.length === 2);
  assert(res1.a[0] === 1);
  assert(res1.a[1] === 2);
  assert(res1.b.length === 2);
  assert(res1.b[0] === 1);
  assert(res1.b[1] === 2);
  assert(res1.c.length === 0);

  const res2 = o.parse(['node', 'test']);
  assert(res2 === null);

  const res3 = o.parse(['node', 'test', '--a=666', '--b=42', '--c', '7', '--c=9', '--c=11', '--c=13']);
  assert(res3.a.length === 1);
  assert(res3.a[0] === 666);
  assert(res3.b.length === 1);
  assert(res3.b[0] === 42);
  assert(res3.c.length === 4);
  assert(res3.c[0] === 7);
  assert(res3.c[1] === 9);
  assert(res3.c[2] === 11);
  assert(res3.c[3] === 13);
});

test('modes', (t) => {
  const o_rectangle = new OptionParser();
  o_rectangle.errorHandler = errorHandler_ignore;
  o_rectangle.addFloat('width', 'width of rectangle').setMandatory();
  o_rectangle.addFloat('height', 'height of rectangle').setMandatory();

  const o_circle = new OptionParser();
  o_circle.errorHandler = errorHandler_ignore;
  o_circle.addFloat('radius', 'radius of circle').setMandatory();

  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addMode('rectangle', o_rectangle);
  o.addMode('circle', o_circle);
  const res1 = o.parse(['node', 'test', 'circle', '--radius=5']);
  assert(res1.mode === 'circle');
  assert(res1.modeValues.radius === 5);

  const res2 = o.parse(['node', 'test', '--radius=5']);
  assert(res2 === null);

  const res3 = o.parse(['node', 'test']);
  assert(res3 === null);

  const res4 = o.parse(['node', 'test', 'circle', '--radiusx=5']);
  assert(res4 === null);

  const res5 = o.parse(['node', 'test', 'rectangle', '--width=42', '--height=24']);
  assert(res5.mode === 'rectangle');
  assert(res5.modeValues.width === 42);
  assert(res5.modeValues.height === 24);
});

test('single character flags', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addFlag('flag-a', 'a flag');
  o.addFlag('flag-b', 'b flag');
  o.addShortAlias('g', 'flag-a');
  o.addShortAlias('h', 'flag-b');

  const res1 = o.parse(['node', 'test', '--flag-a']);
  assert(res1.flagA);
  assert(!res1.flagB);

  const res2 = o.parse(['node', 'test', '--flag-b']);
  assert(!res2.flagA);
  assert(res2.flagB);
  
  const res3 = o.parse(['node', 'test', '-g']);
  assert(res3.flagA);
  assert(!res3.flagB);

  const res4 = o.parse(['node', 'test', '-h']);
  assert(!res4.flagA);
  assert(res4.flagB);

  const res5 = o.parse(['node', 'test', '-gh']);
  assert(res5.flagA);
  assert(res5.flagB);
  
  const res6 = o.parse(['node', 'test', '-hg']);
  assert(res6.flagA);
  assert(res6.flagB);
});

test('single character flags, part 2', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addFlag('flag-a', 'a flag').addShortCode('g');
  o.addFlag('flag-b', 'b flag').addShortCode('h');

  const res1 = o.parse(['node', 'test', '--flag-a']);
  assert(res1.flagA);
  assert(!res1.flagB);

  const res2 = o.parse(['node', 'test', '--flag-b']);
  assert(!res2.flagA);
  assert(res2.flagB);
  
  const res3 = o.parse(['node', 'test', '-g']);
  assert(res3.flagA);
  assert(!res3.flagB);

  const res4 = o.parse(['node', 'test', '-h']);
  assert(!res4.flagA);
  assert(res4.flagB);

  const res5 = o.parse(['node', 'test', '-gh']);
  assert(res5.flagA);
  assert(res5.flagB);
  
  const res6 = o.parse(['node', 'test', '-hg']);
  assert(res6.flagA);
  assert(res6.flagB);
});

test('single character string and int options', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addInt('a', 'a flag');
  o.addString('b', 'b flag');
  o.addShortAlias('g', 'a');
  o.addShortAlias('h', 'b');

  const res1 = o.parse(['node', 'test', '-gh', '42', '43']);
  assert(typeof(res1.a) === 'number');
  assert(typeof(res1.b) === 'string');
  assert(res1.a === 42);
  assert(res1.b === '43');

  const res2 = o.parse(['node', 'test', '-hg', '42', '43']);
  assert(typeof(res2.a) === 'number');
  assert(typeof(res2.b) === 'string');
  assert(res2.a === 43);
  assert(res2.b === '42');
});

test('wrapper', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addInt('a', 'a int');
  o.addFlag('b', 'b');
  const res1 = o.parse(['node', 'test', 'subprogram', '--c']);
  assert(res1 === null);

  const res2 = o.parse(['node', 'test', 'subprogram', '--b']);
  assert(res2 !== null);
  assert(res2.b);
  assert(o.arguments.length === 1);
  assert(o.arguments[0] === 'subprogram');

  o.setWrapper();

  const res3 = o.parse(['node', 'test', 'subprogram', '--c', '--b']);
  assert(!res3.b);
  assert(o.arguments.length === 3);
  assert(o.arguments[0] === 'subprogram');
  assert(o.arguments[1] === '--c');
  assert(o.arguments[2] === '--b');
});

test('hidden', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addInt('super-secret-option', 'a int').setHidden();

  const res1 = o.parse(['node', 'test', '--super-secret-option=42']);
  assert(res1.superSecretOption === 42);

  const u = o.getUsage();
  assert(u.indexOf('super-secret-option') === -1);

  const uh = o.getUsage({showHidden:true});
  assert(uh.indexOf('super-secret-option') > 0);
});

test('nonrepeated option errors', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addFlag('fl', 'a flag');
  const oi_arg = o.addInt('oi', 'an int');
  const res1 = o.parse(['node', 'test', '--fl', '--fl', '--oi=42']);
  assert(res1.fl);
  assert(res1.oi === 42);

  const res2 = o.parse(['node', 'test', '--fl', '--oi=42', '--oi=42']);
  assert(res2 === null);
  
  oi_arg.setTolerateRepeated();

  const res3 = o.parse(['node', 'test', '--fl', '--oi=42', '--oi=43']);
  assert(res3.fl);
  assert(res3.oi === 43);  /// last instance wins!
});

test('presets', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addPreset('a', 'a', {val1: true, val2: false});
  o.addPreset('b', 'b', {val2: true, val3: false});
  o.addPreset('c', 'c', {val1: "c", val3: 42});

  const res1 = o.parse(['node', 'test', '--a', '--b']);
  assert(res1.val1 === true);
  assert(res1.val2 === true);
  assert(res1.val3 === false);

  const res2 = o.parse(['node', 'test', '--b', '--c']);
  assert(res2.val1 === "c");
  assert(res2.val2 === true);
  assert(res2.val3 === 42);

  // TODO: more
});

test('noarg-callbacks', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addInt('a', 'a').setTolerateRepeated();
  o.addNoArgCallback('incr-a', 'increment a', function (values) { values.a += 1; return true; });
  o.addNoArgCallback('throw', 'throw an exception', function () { throw new Error('throw function'); });

  const res1 = o.parse(['node', 'test', '--a=42', '--incr-a']);
  assert(res1.a === 43);

  const res2 = o.parse(['node', 'test', '--a=42', '--incr-a', '--incr-a']);
  assert(res2.a === 44);

  const res3 = o.parse(['node', 'test', '--throw']);
  assert(res3 === null);
});

test('arg-callbacks', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addInt('a', 'a').setTolerateRepeated();
  o.addArgCallback('incr-a', 'DELTA', 'increment a', (value, values) => { values.a += parseFloat(value); return true; }).setTolerateRepeated();

  const res1 = o.parse(['node', 'test', '--a=42', '--incr-a=1']);
  assert(res1.a === 43);

  const res2 = o.parse(['node', 'test', '--a=42', '--incr-a=1', '--incr-a=2']);
  assert(res2.a === 45);

  const res3 = o.parse(['node', 'test', '--a=42', '--incr-a=1', '--incr-a=2', '--a=18']);
  assert(res3.a === 18);
});

test('exclusive-optional', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addFlag('a', 'a');
  o.addFlag('b', 'b');
  o.addFlag('c', 'c');
  o.setExclusive(false, ['a', 'b', 'c']);
  const res1 = o.parse(['node', 'test', '--a']);
  assert(res1.a);
  assert(!res1.b);
  assert(!res1.c);

  const res2 = o.parse(['node', 'test', '--a', '--b']);
  assert(res2 === null);

  const res3 = o.parse(['node', 'test', '--a', '--c']);
  assert(res3 === null);

  const res4 = o.parse(['node', 'test', '--b', '--c']);
  assert(res4 === null);

  const res5 = o.parse(['node', 'test', '--b', '--c', '--a']);
  assert(res5 === null);

  const res6 = o.parse(['node', 'test']);
  assert(!res6.a);
  assert(!res6.b);
  assert(!res6.c);

  const res7 = o.parse(['node', 'test', '--c']);
  assert(!res7.a);
  assert(!res7.b);
  assert(res7.c);
});

test('exclusive mandatory', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_ignore;
  o.addFlag('a', 'a');
  o.addFlag('b', 'b');
  o.addFlag('c', 'c');
  o.setExclusive(true, ['a', 'b', 'c']);
  const res1 = o.parse(['node', 'test', '--a']);
  assert(res1.a);
  assert(!res1.b);
  assert(!res1.c);

  const res2 = o.parse(['node', 'test', '--a', '--b']);
  assert(res2 === null);

  const res3 = o.parse(['node', 'test', '--a', '--c']);
  assert(res3 === null);

  const res4 = o.parse(['node', 'test', '--b', '--c']);
  assert(res4 === null);

  const res5 = o.parse(['node', 'test', '--b', '--c', '--a']);
  assert(res5 === null);

  const res6 = o.parse(['node', 'test']);
  assert(res6 === null);

  const res7 = o.parse(['node', 'test', '--c']);
  assert(!res7.a);
  assert(!res7.b);
  assert(res7.c);
});

function longestLineLength(str) {
  let maxLen = 0;
  str.split('\n').forEach(function (line) {
    const len = line.length;
    if (len > maxLen)
      maxLen = len;
  });
  return maxLen;
}

test('usage wordwrap', (t) => {
  const o = new OptionParser();
  o.programName = 'test';
  o.addFlag('a', 'the quick brown fox jumps over the lazy dog. ' +
                 'the quick brown fox jumps over the lazy dog. ' +
                 'the quick brown fox jumps over the lazy dog. ' +
                 'the quick brown fox jumps over the lazy dog. ' +
                 'the quick brown fox jumps over the lazy dog. ' +
                 'the quick brown fox jumps over the lazy dog. ' +
                 'the quick brown fox jumps over the lazy dog. ');

  function doTestWithWidth(width) {
    const u = o.getUsage({width:width});
    const u_lll = longestLineLength(u);
    assert(width - 5 < u_lll && u_lll <= width);
  }

  for (let w = 60; w <= 100; w++) {
    doTestWithWidth(w);
  }
});

test('usage type registration', (t) => {
  const o = new OptionParser();
  o.programName = 'test';
  o.errorHandler = errorHandler_ignore;
  o.registerType(new TypeInfoVector());
  o.addGeneric('a', 'vector', 'qqq');
  const usage = o.getUsage();
  assert(usage.indexOf('--a=VECTOR') !== -1);
  assert(usage.indexOf('qqq') !== -1);
});
