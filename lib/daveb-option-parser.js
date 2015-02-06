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
  this._tolerateRepeated = false;
  this._hidden = false;
  this._defaultValue = undefined;
  this._label = undefined;
  this._constraints = [];
  this._shortCodes = [];
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
ArgInfo.prototype.setTolerateRepeated = function(isR) {
  this._tolerateRepeated = (isR === undefined) ? true : isR;
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
  this.shortCodes = {};
  this.isWrapper = false;

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
  var t = builtinTypes[type] || this.types[type];
  assert(t !== undefined);
  var jname = this.optionNameToJavascriptName(name);
  assert(!(jname in this.jnameToArgInfo));
  this.order.push(jname);
  var info = new ArgInfo(name, type, description);
  this.jnameToArgInfo[jname] = info;

  // Ignore it if non-argument options (typically flags) are repeated.
  if (!t._requiresArg)
    info._tolerateRepeated = true;

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
    for (   ; rh_i < righthandLines.length; rh_i++)
      output.push(spaces(leftIndent + leftColumnSize + sep) + righthandLines[rh_i]);
  }
}

OptionParser.prototype.setWrapper = function(isW) {
  this.isWrapper = isW === undefined ? true : isW;
  return this;
};

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
  var showHidden = opt.showHidden === undefined ? false : opt.showHidden;
  var showNonhidden = opt.showNonhidden === undefined ? true : opt.showNonhidden;

  var lines = [];

  var programName = self.programName || (process.argv[0] + ' ' + process.argv[1]);
  var firstLine = 'usage: ' + programName + ' [OPTIONS]';
  if (self.modes) {
    firstLine += ' MODE ...';
  }
  if (self.isWrapper) {
    firstLine += ' PROGRAM PROGRAM_ARGUMENTS...';
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
    if (argInfo._hidden) {
      if (!showHidden)
        return;
    } else {
      if (!showNonhidden)
        return;
    }
    var typeInfo = builtinTypes[argInfo.type] || self.types[argInfo.type];
    if (argInfo._requiresArg) {
      v += '=';
      if (argInfo._label)
        v += argInfo._label;
      else
        v += typeInfo._defaultLabel;
    }
    argInfo._shortCodes.forEach(function (sc) {
      v += ' [-' + sc + ']';
    });
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
  var optionParser = this;
  var args = args || process.argv;
  var optionParser = this;
  var encounteredArgInfoNames = {};
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
    if (arg === '--') {
      if (!this.isWrapper && !this.permitArguments) {
        this.errorHandler('encountered --, but arguments are not allowed');
        return null;
      }
      for (i++; i < args.length; i++) {
        this.arguments.push(args[i]);
      }
      break;
    } else if (arg[0] === '-' && arg !== '-') {
      if (arg[1] === '-') {
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

	  if (name === 'help') {
	    console.log(this.getUsage());
	    process.exit(0);
	    return;
	  }
	  if (name === 'help-all') {
	    console.log(this.getUsage({showHidden:true}));
            this.modeOrder.forEach(function (mode) {
              var subop = optionParser.modes[mode];
              console.log('\nOptions for ' + mode);
              console.log(subop.getUsage({showHidden:true}));
            });
	    process.exit(0);
	    return;
	  }
	  if (name === 'help-hidden') {
	    console.log(this.getUsage({showHidden:true, showNonhidden:false}));
            this.modeOrder.forEach(function (mode) {
              var subop = optionParser.modes[mode];
              console.log('\nOptions for ' + mode);
              console.log(subop.getUsage());
            });
	    process.exit(0);
	    return;
	  }
	  if (name.substr(0,5) === 'help-') {
	    var helpTopic = node.substr(5);
	    if (this.modes && (helpTopic in this.modes)) {
	      console.log(this.modes[helpTopic]);
	      process.exit(0);
	      return;
	    } else {
	      this.errorHandler('unknown help topic \'' + helpTopic + '\'');
	      return null;
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
        if (!argInfo._repeated && !argInfo._tolerateRepeated && encounteredArgInfoNames[argInfo.name]) {
          this.errorHandler('got argument ' + argInfo.name + ' multiple times');
          return null;
        }
        encounteredArgInfoNames[argInfo.name] = true;

        if (argInfo._repeated)
          this.values[jname].push(arg_value);
        else
          this.values[jname] = arg_value;
      } else {
        var argInfos = [];
	var nOptionsNeeded = 0;
	for (var shortIndex = 1; shortIndex < arg.length; shortIndex++) {
	  var code = arg[shortIndex];
	  var longname = this.shortCodes[code];
	  if (longname === undefined) {
	    this.errorHandler('short-option \'' + code + '\' unknown (in \'' + arg + '\')');
	    return null;
	  }
	  var jname = this.optionNameToJavascriptName(longname);
	  var argInfo = this.jnameToArgInfo[jname];
	  if (argInfo !== undefined) {
            if (!argInfo._repeated && !argInfo._tolerateRepeated && encounteredArgInfoNames[argInfo.name]) {
              this.errorHandler('got argument ' + argInfo.name + ' multiple times');
              return null;
            }
            encounteredArgInfoNames[argInfo.name] = true;

	    var type = argInfo.type;
	    var typeInfo = builtinTypes[type] || optionParser.types[type];
	    if (typeInfo._requiresArg)
	      nOptionsNeeded++;

	    argInfos.push([code, argInfo, typeInfo, jname]);
	  } else {
	    this.errorHandler('short-option \'' + code + '\' maps to unknown --' + longname + ' (in \'' + arg + '\')');
	    return null;
	  }
	}
	var nArgsAvail = args.length - i - 1;
	if (nOptionsNeeded > nArgsAvail) {
	  this.errorHandler('short-option blob \'' + arg + '\' required ' + nOptionsNeeded + ' but only ' + nArgsAvail + ' available');
	  return null;
	}
	argInfos.forEach(function (tuple) {
	  var shortCode = tuple[0];
	  var argInfo = tuple[1];
	  var typeInfo = tuple[2];
	  var jname = tuple[3];
	  if (typeInfo._requiresArg) {
	    ++i;
	    try {
	      optionParser.values[jname] = typeInfo._parseFunc(args[i], argInfo, typeInfo);
	    } catch (e) {
	      errorHandler('processing short-code \'' + shortCode + '\' (aliased to --' + argInfo.name + ') (argument ' + args[i] + '): ' + e);
	      return null;
	    }
	  } else {
	    try {
	      optionParser.values[jname] = typeInfo._parseFunc(null, argInfo, typeInfo);
	    } catch (e) {
	      errorHandler('processing short-code \'' + shortCode + '\' (aliased to --' + argInfo.name + '): ' + e);
	      return null;
	    }
	  }
	});
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
    } else if (this.isWrapper) {
      for (  ; i < args.length; i++) 
        this.arguments.push(args[i]);
      break;
    } else {
      if (!this.permitArguments) {
        this.errorHandler('unexpected argument \'' + arg + '\'');
        return null;
      }
      this.arguments.push(arg);
    }
  }

  if (this.isWrapper && this.arguments.length === 0) {
    this.errorHandler('expected program name (this is a wrapper program)');
    return null;
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

OptionParser.prototype.addShortAlias = function (code, alias) {
  assert(code.length === 1);
  assert(this.shortCodes[code] === undefined);
  var alias_jname = this.optionNameToJavascriptName(alias);
  var arg = this.jnameToArgInfo[alias_jname];
  if (arg) {
    arg._shortCodes.push(code);
    this.shortCodes[code] = alias;
  } else {
    throw new Error('short alias target \'' + alias + '\' does not exist');
  }
};

// Exports.
exports.OptionParser = OptionParser;
