var OptionParser = require('../lib/index').OptionParser;

var optionParser = new OptionParser({
  description: 'Add two 3-d vectors'
});
optionParser.registerType('vector3', function (value) {
  var pieces = value.split(',');
  if (pieces.length !== 3)
    throw new Error('expected x,y,z');
  return pieces.map(function(v) {
    var r = parseFloat(v);
    if (isNaN(r))
      throw new Error('not a number');
    return r;
  });
});
optionParser.addGeneric('a', 'vector3', 'addend 1').setMandatory();
optionParser.addGeneric('b', 'vector3', 'addend 2').setMandatory();
var options = optionParser.parse();                 // terminates if there are problems

// main program
var a = options.a, b = options.b;
var sum = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
console.log(sum.join(','));
