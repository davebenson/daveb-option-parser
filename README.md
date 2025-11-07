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
import {OptionParser} from 'daveb-option-parser';

// configure options for a very simple counting program.
const optionParser = new OptionParser({
  description: 'Print a finite number of evenly spaced numbers.'
});
optionParser.addInt('count', 'number of lines to print').setMandatory();
optionParser.addFloat('step', 'difference between numbers').setDefaultValue(1);
optionParser.addString('prefix', 'print this before each line').setDefaultValue('');
const options = optionParser.parse();                 // terminates if there are problems

// main program
for (let i = 0; i < options.count; i++)
  console.log(options.prefix + (options.step * i));
```

# Example: constraints
```
const optionParser = new OptionParser({
  description: 'Flip a weighted coin'
});
optionParser.addFloat('prob', 'probability of heads')
                .setDefaultValue(0.5)
                .setMinimum(0.0)
                .setMaximum(1.0);
                .addShortCode('p');
const options = optionParser.parse();
console.log(Math.random() < options.prob ? 'HEAD' : 'TAILS');
```


# Example: Creating a new type.

```javascript
import {OptionParser, TypeInfo} from 'daveb-option-parser';

const optionParser = new OptionParser({
  description: 'Add two 3-d vectors'
});
class TypeInfoVector3 extends TypeInfo {
  constructor() {
    super('vector3');
  }
  parse(value) {
    const pieces = value.split(',');
    if (pieces.length !== 3)
      throw new Error('expected x,y,z');
    return pieces.map(parseFloat);
  }
});
optionParser.registerType(new TypeInfoVector3());
optionParser.addGeneric('a', 'vector3', 'addend 1').setMandatory();
optionParser.addGeneric('b', 'vector3', 'addend 2').setMandatory();
const options = optionParser.parse();  // terminates if there are problems

// main program
const a = options.a, b = options.b;
const sum = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
console.log(sum.join(','));
```

# Example: Command with Different Modes
```javascript
import {OptionParser} from 'daveb-option-parser';

const optionParser = new OptionParser({
  description: 'read/write a string to a file'
});
optionParser.addString('file', 'file to read/write');

const op_write = new OptionParser({ shortDescription: 'write the file' });
op_write.addString('contents', 'file contents');
optionParser.addMode('write', op_write);

const op_read = new OptionParser({ shortDescription: 'read the file' });
optionParser.addMode('read', op_read);

const options = optionParser.parse();
switch (options.mode) {
  case 'read': {
    fs.readFile(options.file, {encoding:'utf8'}, function(err, str) {
      if (err) {
        throw err;
      } else {
        console.log(str);
      }
    });
    break;
  case 'write': {
    fs.writeFile(options.file, options.modeValues.contents, {encoding:'utf8'}, function (err) {
      if (err) {
        throw err;
      }
    });
    break;
  }
}
```

# Reference Documentation

## `OptionParser` class
### `new OptionParser`(_[options]_)
Create a new `OptionParser`.  Options is an object which may contain the following fields:
* `camelCase`: store values keyed by camelCase rather than lowercase_underscore_separated
* `allowArguments`: make the option-parser argumentative.  j/k.
Actually, this makes it so that we collect non-option command-line arguments into the parser's `arguments` member.
* `errorHandler`: function to call if something goes wrong.  if unspecified, the 
program will terminate with an error message.
* `name`: application name, used in usage summary.
* `description`: human-readable blurb that will follow the usage summary in the usage message.

### `addInt`(_name_, _description_)
Add an integer parameter to the option-parser.

Returns a new ArgInfo.

### `addFloat`(_name_, _description_)
Add an float parameter to the option-parser.

Returns a new ArgInfo.

### `addString`(_name_, _description_)
Add a string parameter to the option-parser.

Returns a new `ArgInfo`.

### `registerType`(_typeInfo_)
Add a new type to the option-parser.

### `addGeneric`(_name_, _type_, _description_)
Add a new parameter to the option-parser.

### `addArgCallback`(_name_, _label_, _description_, _fct_)
fct() takes arguments (argument, values, argInfo, typeInfo, optionParser).
It should throw an error to report problems.
Whatever is returned by the function will be set in the values object.

### `addNoArgCallback`(_name_, _description_, _fct_)
fct() takes arguments (values, argInfo, typeInfo, optionParser).
It should throw an error to report problems.

### `addShortAlias`(_shortname_, _longname_)
Alias a one-character name for a long name.

If the original long name takes arguments, they must be given consecutively
after the short-option blob in the same order as in the short options.

### `setExclusive`(_required_, _arrayOfOptionNames_)

Prevent more than one of a set of options to be used.

If required, exactly one must be set.

### `addPreset`(_name_, _description_, _optionDictionary_)
When this long-option is encountered, all the various attributes
in optionDictionary will be copied into the returned values dictionary.

### `addMode`(_name_, _parser_)
Add a new submode for this command.

Once a mode is given, it becomes required to specify a mode.

The user's chosen mode information will be returned in `this.modeName`
and `this.modeValues`.

### `setWrapper`(_isW_)
If `true` then this program will assume it is a wrapper program
whose arguments after the program name will be directly passed to a subprogram.
They will be captured in the `arguments` member, along with the executable name.

Calling this function with no arguments is equivalent to calling it with true.


### `parse`(_[args]_)
Parse the command-line arguments.  If not specified, we process the current process's arguments,
`process.argv`.

The values are returned as an object, unless an non-fatal non-throwing error-handler was installed
and parsing failed, in which case, null is returned. 

After running the option parser has a few members set that can be used:
* `values`: this is the same as the return value of the parse.
* `arguments`: all non-option arguments are collected here.

### `getUsage`(_[options]_)
Return a printable string describing the usage of this program.

If specified, `options` should be an object with the following optional fields:
* `width`: specify screen width for word-wrapping.

## `ArgInfo` class
Represent metadata about an argument to the program (not the actual value).
This is created by the various `add...()` functions in the OptionParser class.
Its methods are "chainable" (they return "this"),
so it is common to write create and configuring the argument in one statement, for example:
```javascript
parser.addInt('some-int', 'an integer').setMandatory().setMinimum(10);
```

### `setDefaultValue`(value)
Populate the returned option values with this value if not given.

### `setMandatory`(m)
Require this option to be given.  If 'm' is given, it should be a boolean: whether this is mandatory.
If not given, it defaults to true (the argument is mandatory).

### `setRepeated`(r)
Allow this option to be specified multiple times.  The entry in the returned 'values' object
for this option will be an array of the types.  Similarly, setDefaultValue() will typically be
given an array (the default default value in this case is the empty array, []).
If this option is tagged 'mandatory', then at least one instance must be given.

### `setTolerateRepeated`(r)
The default for argument-less options, normally repeating non-repeated arguments causes an
error.  If "tolerateRepeated", then instead of an error, just the last
value for that argument is reported.

### `setLabel`(_labelText)

### `setMinimum`(_minimumValue_)
Value must be greater than or equal to minimumValue.
### `setStrictMinimum`(_minimumValue_)
Value must be strictly greater than minimumValue.
### `setMaximum`(_maximumValue_)
Value must be less than or equal to maximumValue.
### `setStrictMaximum`(_maximumValue_)
Value must be strictly less than maximumValue.

### `setInterval`(_minimumValue_, _strictMaximumValue_)
Value must be within halfopen interval: this is equivalent
to setMinimum(minimumValue).setStrictMaximum(strictMaximumValue).

### `addShortCode`(_code_)
One character alias for this argument.

### `setHidden`(_isHidden_)
A hidden option is not documented in the usage message.
It is intended (1) to support deprecated options, (2) to provide a way
for a suite of programs to have private interfaces to facilitate working together,
(3) providing easter eggs.

It should be seldom-used, and it is a sure sign that someone is trying
to do something sneaky!

## `TypeInfo` class
An instance of the TypeInfo class is created when a new type is created via registerType.

You may extend this class to create a new type that can be parsed.

### `parse(arg, values, argInfo, optionParser)`
Usually, you only need the first argument. See example above with vector3.

### `requiresArg()`
Returns whether this type needs an argument. Default: true.

# Details of the Usage Message Generation

# AUTHOR
Dave Benson
