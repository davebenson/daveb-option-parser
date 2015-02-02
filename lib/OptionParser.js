"use strict";

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

OptionParser.prototype.getUsage = function()
{
  var lines = ['usage:'];
  for (var i = 0; i < this.order.length; i++) {
    var arg_info = this.jnameToArgInfo[this.order[i]];
    if (arg_info._hidden)
      continue;
    var l = '  --' + arg_info.name;
    switch (arg_info.type) {
      case 'string': l += '=STR'; break;
      case 'int': l += '=INT'; break;
    }
    if (l.length < 20) {
      while (l.length < 20)
        l += ' ';
      lines.push(l + ' ' + arg_info.description);
    } else {
      lines.push(l);
      lines.push('                     ' + arg_info.description);
    }
  }
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
      this.mode = arg;
      this.modeValues = modeInfo.parser.parse(['node', args[1]].concat(args.slice(i + 1)));
      if (!this.modeValues) {
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

  return this.values;
};

module.exports = OptionParser;
