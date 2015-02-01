# daveb-option-parser

An option parser that does useful type checking
as well as generating a usage message.

# Motivation: Why Another Option Parser?

* better error-handling.  All too often argument parsers do too little type-checking
and force the work to be ad hoc throughout the code.
* better usage message
* no dependencies

# Example

```javascript
var OptionParser = require('daveb-option-parser').OptionParser;

// configure options for a very simple counting program.
var optionParser = new OptionParser({
  description: 'Print a finite number of evenly spaced numbers.'
});
optionParser.addInt('count', 'number of lines to print').setMandatory();
optionParser.addFloat('step', 'difference between numbers').setDefaultValue(1);
optionParser.addString('prefix', 'print this before each line').setDefaultValue('');
var options = optionParser.parse();                 // terminates if there are problems

// main program
for (var i = 0; i < options.count; i++)
  console.log(options.prefix + (options.step * i));
```

# Example: Creating a new type.

```javascript
var OptionParser = require('daveb-option-parser').OptionParser;

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
```

# Reference Documentation

## <tt>OptionParser</tt> class
### <code>new OptionParser([options])</code>
Create a new OptionParser.  Options is an object which may contain the following fields:
* camelCase: store values keyed by camelCase rather than lowercase_underscore_separated
* allowArguments: ...
* errorHandler: function to call if something goes wrong.  if unspecified, the 
program will terminate with an error message.
* name: application name, used in usage summary.
* description: human-readable blurb that will follow the usage summary in the usage message.

### `addInt`(name, description)
Add an integer parameter to the option-parser.

Returns a new ArgInfo.

### `addFloat`(name, description)
Add an float parameter to the option-parser.

Returns a new ArgInfo.

### `addString`(name, description)
Add a string parameter to the option-parser.

Returns a new ArgInfo.

### `registerType`(type, parseFunction)
Add a new type to the option-parser.

Register a new type.

### `addGeneric`(name, type, description)
Add a new parameter to the option-parser.

### `addMode`(name, parser)
Add a new submode for this command.

Once a mode is given, it becomes required to specify a mode.

The user's chosen mode information will be returned in this.modeName
and this.modeValues.

### `parse`([args])
Parse the command-line arguments.  If not specified, we process the current process's arguments,
process.argv.

The values are returned as an object, unless an non-fatal non-throwing error-handler was installed
and parsing failed, in which case, null is returned. 

After running the option parser has a few members set that can be used:
* values: this is the same as the return value of the parse.
* arguments: all non-option arguments are collected here.

### `getUsage`([options])
Return a printable string describing the usage of this program.

Options:
* width: specify screen width for word-wrapping.

## `ArgInfo` class
Represent metadata about an argument to the program (not the actual value).
This is created by the various add...() functions in the OptionParser class.
Its methods are "chainable" (they return "this"),
so it is common to write parser.addInt(...).setMandatory(), etc.

### `setDefaultValue`(value)
Populate the returned option values with this value if not given.

### `setMandatory`(m)
Require this option to be given.  If 'm' is given, it should be a boolean: whether this is mandatory.
If not given, it defaults to true (the argument is mandatory).

### `setRepeatable`(r)
Allow this option to be specified multiple times.  The entry in the returned 'values' object
for this option will be an array of the types.  Similarly, setDefaultValue() will typically be
given an array (the default default value in this case is the empty array, []).
If this option is tagged 'mandatory', then at least one instance must be given.

### setLabel(labelText)

### setMinimum(minimumValue)
Value must be greater than or equal to minimumValue.
### setStrictMinimum(minimumValue)
Value must be strictly greater than minimumValue.
### setMaximum(maximumValue)
Value must be less than or equal to maximumValue.
### setStrictMaximum(maximumValue)
Value must be strictly less than maximumValue.

### setInterval(minimumValue, strictMaximumValue)
Value must be within halfopen interval: this is equivalent
to setMinimum(minimumValue).setStrictMaximum(strictMaximumValue).

## TypeInfo class
An instance of the TypeInfo class is created when a new type is created via registerType.

### setDefaultLabel(labelText)

# TODO
* modes - like git, apt-get, etc support - a family of programs in one executable.
  * designed
  * TODO:
    * implement addMode()
    * implement getUsage()
    * implement parse()
    * example
* short options - single character abbreviations.  multiple characters may
be combined, except only one may take an argument.
* feature: hidden options ?
* feature: wrapper program support
* bug: verify non-repeated arguments are really not repeated
* cleanup: move all default handling to end.
* mutually exclusive options: ie exactly 1 of these N options must be given;
or 0 or 1 of these N options must be given.
* tests
  * permitArguments


# AUTHOR
Dave Benson
