
var OptionParser = require('../lib/daveb-option-parser').OptionParser;

// configure options for a very simple counting program.
var optionParser = new OptionParser({
  description: 'Print a finite number of evenly spaced numbers.'
});
optionParser.addInt('count', 'number of lines to print').setMandatory();
optionParser.addFloat('step', 'difference between numbers').setDefaultValue(1);
optionParser.addString('prefix', 'print this before each line').setDefaultValue('');
var options = optionParser.parse();

// main program
for (var i = 0; i < options.count; i++)
  console.log(options.prefix + (options.step * i));
