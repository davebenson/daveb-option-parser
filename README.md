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


# Reference Documentation

## OptionParser class
### new OptionParser([options])
Create a new OptionParser.  Options is an object which may contain the following fields:
* camelCase: store values keyed by camelCase rather than lowercase_underscore_separated
* allowArguments: ...
* errorHandler: function to call if something goes wrong.  if unspecified, the 
program will terminate with an error message.
* name: application name, used in usage summary.
* description: human-readable blurb that will follow the usage summary in the usage message.

### addInt(name, description)
Add an integer parameter to the option-parser.

Returns a new ArgInfo.

### addFloat(name, description)
Add an float parameter to the option-parser.

Returns a new ArgInfo.

### addString(name, description)
Add a string parameter to the option-parser.

Returns a new ArgInfo.

### registerGeneric(type, parseFunction)
Add a new type to the option-parser.

Register a new type.

### addGeneric(name, type, description)
Add a new parameter to the option-parser.

### parse([args])
Parse the command-line arguments.  If not specified, we process the current process's arguments,
process.argv.

The values are returned as an object, unless an non-fatal non-throwing error-handler was installed
and parsing failed, in which case, null is returned. 

After running the option parser has a few members set that can be used:
* values: this is the same as the return value of the parse.
* arguments: all non-option arguments are collected here.

### getUsage([options])
Return a printable string describing the usage of this program.

Options:
* width: specify screen width for word-wrapping.

## ArgInfo class
Represent metadata about an argument to the program (not the actual value).
This is created by the various add...() functions in the OptionParser class.
Its methods are "chainable" (they return "this"),
so it is common to write parser.addInt(...).setMandatory(), etc.

### setDefaultValue(value)
Populate the returned option values with this value if not given.

### setMandatory(m)
Require this option to be given.  If 'm' is given, it should be a boolean: whether this is mandatory.
If not given, it defaults to true (the argument is mandatory).

### setRepeatable(r)

### setLabel(labelText)


## TypeInfo class
### setDefaultLabel(labelText)

# TODO
* modes - like git, apt-get, etc support - a family of programs in one executable.
* short options - single character abbreviations.  multiple characters may
be combined, except only one may take an argument.
* hidden options ?
* repeatable (and errors on repetition of non-repeatables)
* mutually exclusive options: ie exactly 1 of these N options must be given;
or 0 or 1 of these N options must be given.
* tests
** permitArguments

