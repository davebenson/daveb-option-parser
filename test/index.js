
import {TypeInfo, TypeInfoEnum,
        OptionParser,
        parseFloatOrThrow} from '../lib/daveb-option-parser.js';
import assert from 'node:assert';
import util from 'node:util';
import test from 'node:test';

//function test(desc, f) {
//  console.log(`test: ${desc}`);
//  f();
//  console.log(`test done: ${desc}`);
//}

const errorHandler_ignore = s => {};
const errorHandler_print = s => console.log('ERROR: ' + s);

let curErrorHandler = errorHandler_ignore;

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

test('test int constraints', (t) => {
  const o = new OptionParser({errorHandler: curErrorHandler});
  o.addInt('num-lt-0', 'lt 0').setStrictMaximum(0);
  o.addInt('num-le-0', 'lt 0').setMaximum(0);
  o.addInt('num-gt-0', 'lt 0').setStrictMinimum(0);
  o.addInt('num-ge-0', 'lt 0').setMinimum(0);
  o.addFloat('interval', 'zeroone').setInterval(0,1);

  const res1 = o.parse(['node', 'test', '--num-lt-0=-1']);
  assert.equal(res1.numLt0, -1);
  assert.equal(o.parse(['node', 'test', '--num-lt-0=0']), null);
  assert.equal(o.parse(['node', 'test', '--num-lt-0=1']), null);

  const res2a = o.parse(['node', 'test', '--num-le-0=-1']);
  assert.equal(res2a.numLe0, -1);
  const res2b = o.parse(['node', 'test', '--num-le-0=0']);
  assert.equal(res2b.numLe0, 0);
  assert.equal(o.parse(['node', 'test', '--num-le-0=1']), null);

  const res3 = o.parse(['node', 'test', '--num-gt-0=1']);
  assert.equal(res3.numGt0, 1);
  assert.equal(o.parse(['node', 'test', '--num-gt-0=0']), null);
  assert.equal(o.parse(['node', 'test', '--num-gt-0=-1']), null);

  const res4a = o.parse(['node', 'test', '--num-ge-0=1']);
  assert.equal(res4a.numGe0, 1);
  const res4b = o.parse(['node', 'test', '--num-ge-0=0']);
  assert.equal(res4b.numGe0, 0);
  assert.equal(o.parse(['node', 'test', '--num-ge-0=-1']), null);

  assert.equal(o.parse(['node', 'test', '--interval=-1']), null);
  const res5a = o.parse(['node', 'test', '--interval=0']);
  assert.equal(res5a.interval, 0);
  const res5b = o.parse(['node', 'test', '--interval=0.5']);
  assert.equal(res5b.interval, 0.5);
  assert.equal(o.parse(['node', 'test', '--interval=1']), null);
  assert.equal(o.parse(['node', 'test', '--interval=2']), null);
});


class TypeInfoVector extends TypeInfo {
  constructor() {
    super('vector');
  }
  parse(value, values, argInfo) {
    return value.split(/,/).map(parseFloatOrThrow);
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
  o.errorHandler = curErrorHandler;
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
  const o = new OptionParser();
  o.errorHandler = curErrorHandler;
  o.addMode('rectangle', {}, (op) => {
    op.addFloat('width', 'width of rectangle').setMandatory();
    op.addFloat('height', 'height of rectangle').setMandatory();
  });
  o.addMode('circle', {}, (op) => {
    op.addFloat('radius', 'radius of circle').setMandatory();
  });

  // legacy suboption parser
  const oo = new OptionParser({description: 'sub'});
  o.addMode('sub', oo);

  const res1 = o.parse(['node', 'test', 'circle', '--radius=5']);
  assert(res1.mode === 'circle');
  assert(res1.circle.radius === 5);

  const res2 = o.parse(['node', 'test', '--radius=5']);
  assert(res2 === null);

  const res3 = o.parse(['node', 'test']);
  assert(res3 === null);

  const res4 = o.parse(['node', 'test', 'circle', '--radiusx=5']);
  assert(res4 === null);

  const res5 = o.parse(['node', 'test', 'rectangle', '--width=42', '--height=24']);
  assert(res5.mode === 'rectangle');
  assert(res5.rectangle.width === 42);
  assert(res5.rectangle.height === 24);

  assert.equal(o.parse(['node', 'test', 'badmode']), null);
});

test('single character flags', (t) => {
  const o = new OptionParser();
  o.errorHandler = curErrorHandler;
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
  o.errorHandler = curErrorHandler;
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

test('single character flags, error conditions', (t) => {
  assert.throws(() => {
    const o = new OptionParser();
    o.addInt('a','a').addShortCode('ab');
  },  /short code must be called with a string of length 1/);
});

test('single character string and int options', (t) => {
  const o = new OptionParser();
  o.errorHandler = curErrorHandler;
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

test('no permit arguments', (t) => {
  const o = new OptionParser();
  o.errorHandler = errorHandler_print;
  o.addInt('a', 'a int');
  o.addFlag('b', 'b');
  assert.equal(o.parse(['node', 'test', 'extra']), null);

  assert.throws(() => o.permitArguments(42), /unexpected type passed/);
});

test('permit arguments', (t) => {
  const o = new OptionParser({permitArguments: true});
  o.errorHandler = errorHandler_print;
  o.addInt('a', 'a int');
  o.addFlag('b', 'b');

  const res1 = o.parse(['node', 'test', 'subprogram', '--c']);
  assert(res1 === null);

  const res2 = o.parse(['node', 'test', 'subprogram', '--b']);
  assert(res2 !== null);
  assert(res2.b);
  assert(res2.arguments.length === 1);
  assert(res2.arguments[0] === 'subprogram');

  const o2 = new OptionParser();
  o2.errorHandler = curErrorHandler;
  const res2o1 = o2.parse(['node', 'test', 'subprogram', '--c']);
  assert(res2o1 === null);
  o2.permitArguments();
  const res2o2 = o2.parse(['node', 'test', 'subprogram']);
  assert.deepEqual(res2o2.arguments, ['subprogram']);
  assert(o2.getUsage().indexOf("ARGUMENTS...") != -1);

  const o3 = new OptionParser({programName: 'testenumprog'});
  const ct = new TypeInfoEnum('myenum', ['a','b']);
  o3.permitArguments(ct);
  const res3_1 = o3.parse(['node', 'test', 'a', 'B']);
  assert.deepEqual(res3_1.arguments, ['a', 'b']);
  const usage = o3.getUsage();
  assert(usage.indexOf('testenumprog MYENUM...') != -1);
  const res3_2 = o3.parse(['node', 'test', '--', 'a', 'B']);
  assert.deepEqual(res3_2.arguments, ['a', 'b']);

  o3.permitArguments(ct, 'MY_ENUMZ');
  console.log(o3.getUsage());
  assert(o3.getUsage().indexOf('testenumprog MY_ENUMZ') != -1);
});

test('wrapper', (t) => {
  const o = new OptionParser({permitArguments: true});
  o.errorHandler = errorHandler_print;
  o.addInt('a', 'a int');
  o.addFlag('b', 'b');
  o.setWrapper();

  const res3 = o.parse(['node', 'test', 'subprogram', '--c', '--b']);
  assert(!res3.b);
  assert(res3.arguments.length === 3);
  assert(res3.arguments[0] === 'subprogram');
  assert(res3.arguments[1] === '--c');
  assert(res3.arguments[2] === '--b');

  const res4 = o.parse(['node', 'test', '--', 'subprogram', '--c', '--b']);
  assert(!res4.b);
  assert(res4.arguments.length === 3);
  assert(res4.arguments[0] === 'subprogram');
  assert(res4.arguments[1] === '--c');
  assert(res4.arguments[2] === '--b');

  assert.equal(o.parse(['node', 'test']), null);
  assert.equal(o.parse(['node', 'test', '--']), null);

  const usage = o.getUsage({programName: "foo"});
  assert(usage.indexOf('usage: foo [OPTIONS] PROGRAM PROGRAM_ARGUMENTS...') != -1);
});

test('hidden', (t) => {
  const o = new OptionParser();
  o.errorHandler = curErrorHandler;
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
  o.errorHandler = curErrorHandler;
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
  o.errorHandler = curErrorHandler;
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
  o.errorHandler = curErrorHandler;
  o.addInt('a', 'a').setTolerateRepeated();
  o.addNoArgCallback('incr-a', 'increment a', function (values) { values.a += 1; return true; });
  o.addNoArgCallback('throw', 'throw an exception', function () { throw new Error('throw function'); }).addShortCode('t');

  const res1 = o.parse(['node', 'test', '--a=42', '--incr-a']);
  assert(res1.a === 43);

  const res2 = o.parse(['node', 'test', '--a=42', '--incr-a', '--incr-a']);
  assert(res2.a === 44);

  assert.equal(o.parse(['node', 'test', '--throw']), null);
  assert.equal(o.parse(['node', 'test', '-t']), null);
});

test('arg-callbacks', (t) => {
  const o = new OptionParser();
  o.errorHandler = curErrorHandler;
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
  o.errorHandler = curErrorHandler;
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
  o.errorHandler = curErrorHandler;
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

test('permit arg array of type', (t) => {
  const o = new OptionParser({permitArguments: 'int',
                              errorHandler: curErrorHandler});
  const args = o.parse(['node', 'test', '1', '2', '3']);
  assert.deepEqual(args, {arguments: [1,2,3]});
});

test('permit arg of array of types', (t) => {
  const o = new OptionParser({permitArguments: ['int','int','int'],
                              errorHandler: curErrorHandler});
  const args = o.parse(['node', 'test', '1', '2', '3']);
  assert.deepEqual(args, {arguments: [1,2,3]});

  assert(o.parse(['node', 'test', '1', '2']) === null);
  assert(o.parse(['node', 'test', '1', '2', '3', '4']) === null);
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
  o.addFlag('b', 'the quick brown fox jumps over the lazy dog.\n' +
                 'the quick brown fox jumps over the lazy dog.\n' +
                 'the quick brown fox jumps over the lazy dog.\n' +
                 'the quick brown fox jumps over the lazy dog.\n' +
                 'the quick brown fox jumps over the lazy dog.\n' +
                 'the quick brown fox jumps over the lazy dog.\n' +
                 'the quick brown fox jumps over the lazy dog.\n');

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
  o.errorHandler = curErrorHandler;
  o.registerType(new TypeInfoVector());
  o.addGeneric('a', 'vector', 'qqq');
  const usage = o.getUsage();
  assert(usage.indexOf('--a=VECTOR') !== -1);
  assert(usage.indexOf('qqq') !== -1);
});

test('usage permit arguments', (t) => {
  const o = new OptionParser({programName: 'testprog'});
  o.permitArguments('int');
  assert(o.getUsage().indexOf("usage: testprog INT...\n") >= 0);

  const o2 = new OptionParser({programName: 'testprog'});
  o2.permitArguments(['int', 'float']);
  assert(o2.getUsage().indexOf("usage: testprog INT FLOAT\n") >= 0);
});

test('usage commandline arguments', (t) => {
  const o = new OptionParser({programName: 'testprog', usageHandler: x => x});
  o.addInt('a', 'a value').addShortCode('x');
  o.addInt('b', 'b value').setHidden();
  const rv = o.parse(["node", "test", "--help"]);
  assert.equal(typeof(rv), 'string');
  assert(rv.indexOf('a value') != -1);
  assert(rv.indexOf('b value') == -1);
  const rvhidden = o.parse(["node", "test", "--help-hidden"]);
  assert.equal(typeof(rvhidden), 'string');
  assert(rvhidden.indexOf('a value') == -1);
  assert(rvhidden.indexOf('b value') != -1);
  const rvall = o.parse(["node", "test", "--help-all"]);
  assert.equal(typeof(rvall), 'string');
  assert(rvall.indexOf('a value') != -1);
  assert(rvall.indexOf('b value') != -1);

  const o2 = new OptionParser({programName: 'testprog', errorHandler: curErrorHandler});
  o2.setUsageHandler(x => x);
  o2.addMode('testmode', {description: 'testmode tree'}, (op) => {
    op.addInt('a', 'a value');
  });
  const rv2a = o2.parse(["node", "test", "--help"]);
  assert.equal(typeof(rv2a), 'string');

  const rv2 = o2.parse(["node", "test", "testmode", "--help"]);
  assert.equal(rv2.mode, "testmode");
  assert.equal(typeof(rv2.testmode), 'string');

  const rv2dump = o2.parse(["node", "test", "--help-mode-tree"]);
  assert.equal(rv2dump, 'testmode: testmode tree');

  const rv2mode = o2.parse(["node", "test", "--help-testmode"]);
  assert.equal(typeof(rv2mode), 'string');

  const rv2badmode = o2.parse(["node", "test", "--help-badmode"]);
  assert.equal(rv2badmode, null);

  const rv2all = o2.parse(["node", "test", "--help-all"]);
  assert.equal(typeof(rv2all), 'string');
});

test('enum unit test', (t) => {
  const ti1 = new TypeInfoEnum('ti1', ['a','b','c']);
  assert.throws(() => ti1.parse('d'), /bad value for type/);
  assert.equal(ti1.parse('a'), 'a');
  assert.equal(ti1.parse('A'), 'a');

  const ti2 = new TypeInfoEnum('ti2', ['A','B','C']);
  assert.throws(() => ti2.parse('D'), /bad value for type/);
  assert.equal(ti2.parse('a'), 'A');
  assert.equal(ti2.parse('A'), 'A');

  const ti3 = new TypeInfoEnum('ti3', ['A', 'a']);
  assert.throws(() => ti3.parse('D'), /bad value for type/);
  assert.equal(ti3.parse('a'), 'a');
  assert.equal(ti3.parse('A'), 'A');

  const op = new OptionParser({types: [ti1], args: [
                                {name: 'v1', type: 'ti1', description: 'desc of v1'}
                              ]});
  const res1 = op.parse(['node', 'test', '--v1=a']);
  assert.equal(res1.v1, 'a');
});

test('underscore convention', (t) => {
  const op = new OptionParser({camelCase: false});
  op.addInt('test-foo', 'test foo');
  op.addInt('bar-x', 'bar x');
  const res1 = op.parse(['node', 'test', '--test-foo=42', '--bar-x=666']);
  assert.equal(res1.test_foo, 42);
  assert.equal(res1.bar_x, 666);
});

test('kebab convention', (t) => {
  const op = new OptionParser({optionNameToJavascriptName: 'kebab'});
  op.addInt('test-foo', 'test foo');
  op.addInt('bar-x', 'bar x');
  const res1 = op.parse(['node', 'test', '--test-foo=42', '--bar-x=666']);
  assert.equal(res1['test-foo'], 42);
  assert.equal(res1['bar-x'], 666);
});

test('identity naming convention', (t) => {
  const op = new OptionParser({optionNameToJavascriptName: 'identity'});
  op.addInt('test-foo', 'test foo');
  op.addInt('bar-x', 'bar x');
  const res1 = op.parse(['node', 'test', '--test-foo=42', '--bar-x=666']);
  assert.equal(res1['test-foo'], 42);
  assert.equal(res1['bar-x'], 666);
});

test('custom naming convention', (t) => {
  const op = new OptionParser({optionNameToJavascriptName: (s) => s.toUpperCase()});
  op.addInt('test-foo', 'test foo');
  op.addInt('bar-x', 'bar x');
  const res1 = op.parse(['node', 'test', '--test-foo=42', '--bar-x=666']);
  assert.equal(res1['TEST-FOO'], 42);
  assert.equal(res1['BAR-X'], 666);
});

test('arg options', (t) => {
  const o = new OptionParser();
  o.addInt('a','a', {shortCodes: 'cd'});
  assert.deepStrictEqual(o.parse(['node','test','--a=42']), {a:42});
  assert.deepStrictEqual(o.parse(['node','test','-c','42']), {a:42});
  assert.deepStrictEqual(o.parse(['node','test','-d','42']), {a:42});
});

test('multi-short-code', (t) => {
  const o = new OptionParser({errorHandler: curErrorHandler});
  o.addInt('a', 'a value').addShortCode('b');
  o.addInt('c', 'c value').addShortCode('d');
  assert.equal(o.parse(["node", "test", "--a"]), null);
  assert.deepEqual(o.parse(["node", "test", "--a=42"]), {a:42});
  assert.equal(o.parse(["node", "test", "-b"]), null);
  assert.deepEqual(o.parse(["node", "test", "-b", '42']), {a:42});
  assert.deepEqual(o.parse(["node", "test", "-bd", '42', '13']), {a:42, c:13});
  assert.equal(o.parse(["node", "test", "-bb", '42', '13']), null);
  assert.equal(o.parse(["node", "test", "-b", 'notanint']), null);

  // hack to add bogus short code to test otherwise unreachable condition.
  o.shortCodes['x'] = 'xxx';
  assert.equal(o.parse(["node", "test", "-x", '42']), null);
  assert.equal(o.parse(["node", "test", "-y", '42']), null);
});

test('argument conflict errors', (t) => {
  assert.throws(() => {
    const o = new OptionParser();
    o.addInt('a','a');
    o.addInt('a','a');
  }, /already have an option with the same name/);
});

test('mode conflict errors', (t) => {
  assert.throws(() => {
    const o = new OptionParser();
    o.addMode('a', (op) => {});
    o.addMode('a', (op) => {});
  }, /mode a already registered/);
  assert.throws(() => {
    const o = new OptionParser();
    o.addMode('a', (op) => {});
    o.addModeAlias('b', 'a');
    o.addMode('b', (op) => {});
  }, /mode b already registered as an alias/);
  assert.throws(() => {
    const o = new OptionParser();
    o.addModeAlias('b', 'a');
  }, /original mode a not available/);
  assert.throws(() => {
    const o = new OptionParser();
    o.addMode('a', (op) => {});
    o.addModeAlias('a', 'a');
  }, /new mode a already registered/);
  assert.throws(() => {
    const o = new OptionParser();
    o.addMode('a', (op) => {});
    o.addModeAlias('b', 'a');
    o.addModeAlias('b', 'a');
  }, /new mode b already registered as an alias/);
});


//// TODO: whereever these are not total hacks, move to their own tests.
test('misc coverage tests', (t) => {
  assert.throws(() => new TypeInfo('foo').parse('test', {}, {}), /not implemented/);
  assert.throws(() => {
    const o = new OptionParser();
    o.permitArguments('unkdefinedtype');
  }, /unknown type name/);
  assert.throws(() => {
    const o = new OptionParser();
    o.permitArguments(['unkdefinedtype']);
  }, /cannot find type named/);
  assert.throws(() => {
    const o = new OptionParser();
    o.setExclusive(false, ['a']);
  }, /unknown option 'a' given as argument to setExclusive/);

  assert.throws(() => {
    const o = new OptionParser({errorHandler: curErrorHandler});
    o.addShortAlias('a', 'b');
  }, /does not exist/);
  {
    const o = new OptionParser({errorHandler: curErrorHandler});
    assert.equal(o.parse(["node", "test", "--"]), null);
  }
  {
    const o = new OptionParser({errorHandler: curErrorHandler});
    o.permittedArgs = 666; // bad value
    assert.equal(o.parse(["node", "test", "--", '666']), null);
    assert.throws(() => o.getUsage());
  }
});

