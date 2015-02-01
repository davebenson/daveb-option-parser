# daveb-option-parser

An option parser that does useful type checking
as well as generating a usage message.

# Motivation: Why Another Option Parser?

* better error-handling (more checking and reporting)
* better usage message
* no dependencies

# Example

    var OptionParser = require('daveb-option-parser').OptionParser;

    // configure options for a very simple counting program.
    var optionParser = new OptionParser();
    optionParser.addInt('count', 'number of lines to print').setMandatory();
    optionParser.addFloat('step', 'difference between numbers').setDefaultValue(1);
    optionParser.addString('prefix', 'print this before each line').setDefaultValue('');
    var options = optionParser.parse();

    // main program
    for (var i = 0; i < options.count; i++)
      console.log(options.prefix + (options.step * i));


# Reference Documentation

## OptionParser class
### new OptionParser([options])
Create a new OptionParser.  Options is an object which may contain the following fields:
* camelCase - store values keyed by camelCase rather than lowercase_underscore_separated
* errorHandler - function to call if something goes wrong.  if unspecified, the 
program will terminate with an error message.

### addInt(name, description)
### addFloat(name, description)
### addString(name, description)
### registerGeneric(type, parseFunction)
### addGeneric(name, type, description)
### parse([args])

### getUsage([options])

## ArgInfo class
### setDefaultValue(value)
### setMandatory(m)
### setLabel(labelText)

## TypeInfo class
### setDefaultLabel(labelText)

# TODO
* modes - like git, apt-get, etc support - a family of programs in one executable.
* short options - single character abbreviations.  multiple characters may
be combined, except only one may take an argument.
* hidden options ?
* 

