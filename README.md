# daveb-option-parser

An option parser that does useful type checking
as well as generating a usage message.

# Motivation

# Example

    var OptionParser = require('daveb-option-parser').OptionParser;

    // configure options for a very simple counting program.
    var optionParser = new OptionParser();
    optionParser.addInt('count', 'number of lines to print).mandatory();
    optionParser.addFloat('step', 'difference between numbers').defaultValue(1);
    optionParser.addString('prefix', 'print this before each line').defaultValue('');
    var options = optionParser.parse();

    // main program
    for (var i = 0; i < options.count; i++)
      console.log(options.prefix + (options.step * i));

