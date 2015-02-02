"use strict";

// Dependencies.
var assert = require('assert');

//
// The 'javascript name' or sometimes 'jname' is
// simply the option name converted to a member name.
// The member naming convention defaults to camel-case,
// if explicitly false we convert '-' to '_' instead.
// So, for example,
///     --this-option      has 'name' 'this-option'
// Its javascript name depends on the camelCase setting.
// If camelCase (the default),
//      javascriptName == jname == thisOption
// If !camelCase,
//      javascriptName == jname == this_option
//

function TypeInfo(name, parseFunc)
{
  this.name = name;
  this._parseFunc = parseFunc;
  this._defaultLabel = name.toUpperCase().replace(/-/g, '_');
  this._requiresArg = true;
}
TypeInfo.prototype.setRequiresArg = function(r) {
  this._requiresArg = r === undefined ? true : r;
  return this;
};

function parseFunc_int(value) {
  var rv = parseInt(value);
  if (isNaN(rv))
    throw new Error('invalid integer');
  return rv;
}
function parseFunc_float(value) {
  var rv = parseFloat(value);
  if (isNaN(rv))
    throw new Error('invalid number');
  return rv;
}

var booleanStrings = {
  true: true, yes: true, t: true, y: true, 1: true,
  false: false, no: false, f: false, n: false, 0: false
};
function parseFunc_flag(value)
{
  if (value === null) {
    return true;
  }

  var rv = booleanStrings[value.toLowerCase()];
  if (rv === undefined)
    throw new Error('error parsing boolean from ' + value);
  return rv;
}

var builtinTypes = {
  int: new TypeInfo('int', parseFunc_int),
  float: new TypeInfo('float', parseFunc_float),
  flag: new TypeInfo('flag', parseFunc_flag).setRequiresArg(false),
  string: new TypeInfo('string', function (value) { return value; }),
};

function ArgInfo(name, type, description) 
{
  this.name = name;
  this.type = type;
  this.description = description;
  this._mandatory = false;
  this._repeated = false;
  this._hidden = false;
  this._defaultValue = undefined;
  this._label = undefined;
  this._constraints = [];
}

ArgInfo.prototype.setMandatory = function(isM) {
  this._mandatory = (isM === undefined) ? true : isM;
  return this;
};
ArgInfo.prototype.setRepeated = function(isR) {
  this._repeated = (isR === undefined) ? true : isR;
  return this;
};
ArgInfo.prototype.setHidden = function(isH) {
  this._hidden = (isH === undefined) ? true : isH;
  return this;
};

ArgInfo.prototype.setDefaultValue = function(v) {
  this._defaultValue = v;
  return this;
}

ArgInfo.prototype.setLabel = function(label) {
  this._argPrototypeLabel = label;
  return this;
};

ArgInfo.prototype.addConstraint = function(testFunc) {
  this._constraints.push(testFunc);
  return this;
};
ArgInfo.prototype.setMinimum = function(minimumValue) {
  return this.addConstraint(function(value) {
    if (value < minimumValue)
      throw new Error('too small (must be at least ' + minimumValue + ')');
  });
};
ArgInfo.prototype.setStrictMinimum = function(minimumValue) {
  return this.addConstraint(function(value) {
    if (value <= minimumValue)
      throw new Error('too small (must be more than ' + minimumValue + ')');
  });
};
ArgInfo.prototype.setMaximum = function(maximumValue) {
  return this.addConstraint(function(value) {
    if (value > maximumValue)
      throw new Error('too large (must be at most ' + maximumValue + ')');
  });
};
ArgInfo.prototype.setStrictMaximum = function(maximumValue) {
  return this.addConstraint(function(value) {
    if (value >= maximumValue)
      throw new Error('too large (must be less than ' + maximumValue + ')');
  });
};
ArgInfo.prototype.setInterval = function(a, b) {
  return this.addConstraint(function(value) {
    if (value < a || value >= b)
      throw new Error('value is outside of interval [' + a + ', ' + b + ')');
  });
};

function OptionParser(opts)
{
  var options = opts || {};
  var self = this;
  this.jnameToArgInfo = {};
  this.order = [];
  this.types = {};
  this.modes = null;
  this.modeOrder = null;
  this.shortDescription = options.shortDescription;
  this.description = options.description;

  var initWithDef = function(name, def) {
    self[name] = (options[name] === undefined) ? def : options[name];
  };

  initWithDef('camelCase', true);
  initWithDef('permitArguments', true);
};

OptionParser.prototype.optionNameToJavascriptName = function(name)
{
  if (this.camelCase) {
    return name.replace(/-([a-z])/g, function(w,p) { return p.toUpperCase() }).replace('-', '');
  } else {
    return name.replace(/-/g, '_');
  }
}
OptionParser.prototype.addGeneric = function(name, type, description)
{
  assert((type in builtinTypes) || (type in this.types));
  var jname = this.optionNameToJavascriptName(name);
  assert(!(jname in this.jnameToArgInfo));
  this.order.push(jname);
  var info = new ArgInfo(name, type, description);
  this.jnameToArgInfo[jname] = info;
  return info;
};

OptionParser.prototype.addString = function(name, description)
{
  return this.addGeneric(name, 'string', description);
};

OptionParser.prototype.addInt = function(name, description)
{
  return this.addGeneric(name, 'int', description);
};

OptionParser.prototype.addFlag = function(name, description)
{
  return this.addGeneric(name, 'flag', description);
};

OptionParser.prototype.addFloat = function(name, description)
{
  return this.addGeneric(name, 'float', description);
};

OptionParser.prototype.registerType = function(type, parseFunc)
{
  assert(!(type in this.types));
  return this.types[type] = new TypeInfo(type, parseFunc);
}

OptionParser.prototype.addMode = function(mode, subOptionParser)
{
  if (!this.modes) {
    this.modes = {};
    this.modeOrder = [];
  }

  assert(this.modes[mode] === undefined);

  this.modes[mode] = {
    name: mode,
    parser: subOptionParser
  };
  this.modeOrder.push(mode);
}

function spaces(count) {
  var s = ''; 
  var x = ' ';
  for (;;) { 
    if (count & 1)
      s += x; 
    count >>= 1; 
    if (count)
      x += x; 
    else
      break; 
  } 
  return s; 
} 

function wordwrap(text, width) {
  var rv = [];
  var at = 0;

  function nextToken() {
    while (at < text.length && (text[at] === ' ' || text[at] === '\t'))
      at++;
    if (at === text.length)
      return null;
    if (text[at] === '\n') {
      at++;
      return '\n';
    }
    var start = at;
    while (at < text.length && (text[at] !== ' ' && text[at] !== '\n' && text[at] !== '\t'))
      at++;
    assert(at > start);
    return text.substring(start, at);
  }

  var o = '';
  var t;
  var rv = [];
  while ((t=nextToken()) !== null) {
    if (t === '\n') {
      rv.push(o);
      o = '';
    } else {
      if (o.length === 0)
        o = t;
      else if (o.length + 1 + t.length > width) {
        rv.push(o);
	o = t;
      } else {
        o += ' ' + t;
      }
    }
  }
  if (o !== '')
    rv.push(o);
  return rv;
}

function formatTwoColumn(leftIndent, leftColumnMax, sep, totalWidth,
                         leftColumn, rightColumn,
                         output)
{
  var maxLeftColumnLength = 0;
  for (var i = 0; i < leftColumn.length; i++) {
    if (leftColumn[i].length > maxLeftColumnLength)
      maxLeftColumnLength = leftColumn[i].length;
  }

  var leftColumnSize = Math.min(maxLeftColumnLength, leftColumnMax);
  var rightColumnSize = totalWidth - leftIndent - leftColumnSize - sep;

  for (var i = 0; i < leftColumn.length; i++) {
    var left = leftColumn[i];
    var righthandLines = wordwrap(rightColumn[i], rightColumnSize);
    var rh_i;
    if (left.length > leftColumnSize || righthandLines.length === 0) {
      output.push(spaces(leftIndent) + left);
      rh_i = 0;
    } else {
      output.push(spaces(leftIndent) +
                  left +
		  spaces(leftColumnSize - left.length + sep) +
		  righthandLines[0]);
      rh_i = 1;
    }
  }
  for (   ; rh_i < righthandLines.length; rh_i++)
    output.push(spcaes(optIndent + optSize + optSep) + righthandLines[rh_i]);
}

var defaultOptions = {
};

OptionParser.prototype.getUsage = function(options)
{
  var self = this;

  var opt = options || defaultOptions;
  var width = opt.width || 80;
  var optIndent = 2;
  var optMaxSize = opt.optionMaxSize || Math.ceil(width/5);
  var optSep = opt.optionDescriptionSep || 2;

  var lines = [];

  var programName = self.programName || (process.argv[0] + ' ' + process.argv[1]);
  var firstLine = 'usage: ' + programName + ' [OPTIONS]';
  if (self.modes) {
    firstLine += ' MODE ...';
  }
  lines.push(firstLine);

  if (this.description) {
    lines.push('');
    wordwrap(this.description, width).forEach(function(descLine) {
      lines.push(descLine);
    });
  }

  if (self.modes) {
    lines.push('');
    lines.push('where MODE is one of:');
    var modeDescriptions = self.modeOrder.map(function(m) {
      return self.modes[m].parser.shortDescription || '';
    });
    formatTwoColumn(optIndent, optMaxSize, optSep, width,
                    self.modeOrder, modeDescriptions,
                    lines);
  }

  lines.push('');
  lines.push('options:');
  var optionLeftColumn = [];
  var descColumn = [];
  this.order.forEach(function(argJName) {
    var argInfo = self.jnameToArgInfo[argJName];
    var v = '--' + argInfo.name;
    var typeInfo = builtinTypes[argInfo.type] || self.types[argInfo.type];
    if (argInfo._requiresArg) {
      v += '=';
      if (argInfo._label)
        v += argInfo._label;
      else
        v += typeInfo._defaultLabel;
    }
    optionLeftColumn.push(v);
    descColumn.push(argInfo.description);
  });

  formatTwoColumn(optIndent, optMaxSize, optSep, width,
                  optionLeftColumn, descColumn,
                  lines);

  lines.push('');
  return lines.join('\n');
};

OptionParser.prototype.errorHandler = function(errorMessage, argInfo) {
  console.log(errorMessage);
  console.log(this.getUsage());
  process.exit(1);
};

OptionParser.prototype.parse = function(args)
{
  var args = args || process.argv;
  this.arguments = [];
  this.values = {};

  // Handle default values and initialize all repeated fields to [].
  for (var jname in this.jnameToArgInfo) {
    var argInfo = this.jnameToArgInfo[jname];
    if (argInfo._repeated) 
      this.values[jname] = [];
    else if (argInfo._defaultValue !== undefined)
      this.values[jname] = argInfo._defaultValue;
  }

  for (var i = 2; i < args.length; i++) {
    var arg = args[i];
    if (arg == '--') {
      if (!this.permitArguments) {
        this.errorHandler('encountered --, but arguments are not allowed');
        return null;
      }
      for (i++; i < args.length; i++) {
        this.arguments.push(args[i]);
      }
      break;
    } else if (arg[0] == '-') {
      if (arg == '-') {
        this.arguments.push('-');
      } else if (arg[1] == '-') {
        // long option
        var name, arg_value;
        var preparsed = false;
        var eq_index = arg.indexOf('=');
        if (eq_index == -1) {
          name = arg.substring(2);
          arg_value = null;
        } else {
          name = arg.substring(2, eq_index);
          arg_value = arg.substring(eq_index + 1);
        }
        var jname = this.optionNameToJavascriptName(name);
        if (!(jname in this.jnameToArgInfo)) {
          var specialCaseHandled = false;

          if (name.substr(0,3) === 'no-') {
            var jnameSansNo = this.optionNameToJavascriptName(name.substr(3));
            if (this.jnameToArgInfo[jnameSansNo] &&
                this.jnameToArgInfo[jnameSansNo].type === 'flag') {
              jname = jnameSansNo;
              arg_value = false;
              preparsed = true;
              specialCaseHandled = true;
            }
          }

          if (!specialCaseHandled) {
            this.errorHandler('unknown option: \'' + arg + '\'', null);
            return null;
          }
        }
        var argInfo = this.jnameToArgInfo[jname];
        var type = argInfo.type;
        var typeInfo = this.types[type] || builtinTypes[type];
        if (!typeInfo) {
          this.errorHandler('invalid type (' + type + ') of option encountered');
          return null;
        }

        if (arg_value === null && typeInfo._requiresArg) {
          if (i + 1 == args.length) {
            this.errorHandler('option ' + arg + ' requires argument');
            return null;
          }
          i++;
          arg_value = args[i];
        }

        if (!preparsed) {
          var parseFunc = typeInfo._parseFunc;
          try {
            arg_value = parseFunc(arg_value, argInfo, typeInfo);
          } catch (e) {
            this.errorHandler('error parsing argument ' + arg + ': ' + e);
            return null;
          }
          for (var conIndex = 0; conIndex < argInfo._constraints.length; conIndex++) {
            var constraint = argInfo._constraints[conIndex];
            try {
              constraint(arg_value, argInfo, typeInfo);
            } catch (e) {
              this.errorHandler('bad value for ' + name + ': ' + e);
              return null;
            }
          }
        }
        if (argInfo._repeated)
          this.values[jname].push(arg_value);
        else
          this.values[jname] = arg_value;
      } else {
        // short option
        assert(false);  // not supported for now
      }
    } else if (this.modes) {
      if (this.modes[arg] === undefined) {
        var msg = 'unknown mode ' + arg + ': expected one of: ' + this.modeOrder.join(' ');
        this.errorHandler(msg);
        return null;
      }
      var modeInfo = this.modes[arg];
      this.values.mode = arg;
      this.values.modeValues = modeInfo.parser.parse(['node', args[1]].concat(args.slice(i + 1)));
      if (!this.values.modeValues) {
        this.errorHandler('error parsing submode ' + arg);
        return null;
      }
      break;            // submode handles ALL remaining arguments
    } else {
      if (!this.permitArguments) {
        this.errorHandler('unexpected argument \'' + arg + '\'');
        return null;
      }
      this.arguments.push(arg);
    }
  }

  // Look for missing mandatory arguments, and repeated arguments with default values.
  for (var arg in this.jnameToArgInfo) {
    var argInfo = this.jnameToArgInfo[arg];
    if (argInfo._mandatory) {
      if (argInfo._repeated) {
        if (this.values[arg].length === 0) {
          this.errorHandler('missing mandatory repeated argument --' + argInfo.name);
          return null;
        }
      } else {
        if (!(arg in this.values)) {
          this.errorHandler('missing mandatory argument --' + argInfo.name);
          return null;
        }
      }
    } else if (argInfo._repeated) {
      if (argInfo._defaultValue !== undefined && this.values[arg].length === 0) {
        this.values[arg] = argInfo._defaultValue;
      }
    }
  }

  if (this.modes && this.values.mode === undefined) {
    this.errorHandler('no mode give');
    return null;
  }

  return this.values;
};

// Exports.
exports.OptionParser = OptionParser;