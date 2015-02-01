# daveb-option-parser

An option parser that does useful type checking
as well as generating a usage message.

# Motivation: Why Another Option Parser?

# Example

    var OptionParser = require('daveb-option-parser').OptionParser;

    // configure options for a very simple counting program.
    var optionParser = new OptionParser();
    optionParser.addInt('count', 'number of lines to print').mandatory();
    optionParser.addFloat('step', 'difference between numbers').defaultValue(1);
    optionParser.addString('prefix', 'print this before each line').defaultValue('');
    var options = optionParser.parse();

    // main program
    for (var i = 0; i < options.count; i++)
      console.log(options.prefix + (options.step * i));


# Reference Documentation

## OptionParser class
### new OptionParser(options)
Create a new OptionParser.  Options is optional; if given it must be an object
which may contain the following fields:
* camelCase - store values keyed by camelCase rather than lowercase_underscore_separated

### addInt(name, description)
### addFloat(name, description)
### addString(name, description)
### registerGeneric(type, parseFunction)
### addGeneric(name, type, description)

### getUsage()

## ArgInfo class
### setDefaultValue(value)
### setMandatory(m)

## TypeInfo class
### setLabel(labelText)
