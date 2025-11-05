"use strict";

// Dependencies.
import assert from 'node:assert';
import path from 'node:path';
import util from 'node:util';

//
// The 'javascript name' or sometimes 'jname' is
// simply the option name converted to a member name.
// (Which defaults to the camelCase convention).
//
// The member naming convention defaults to camel-case,
// but if false it uses underscore-conventions:
// '-' is replaced with '_'.
//

//
// So, for example,
///     --this-option      has 'name' 'this-option'
//
// Its javascript name depends on the camelCase setting.
//
// If camelCase (the default),
//      javascriptName = 'thisOption'
// If !camelCase,
//      javascriptName = 'this_option'
//

//
// TypeInfo parsing a certain type of value,
// for example, int or float.
//
// You can make custom types if you want.
//
export class TypeInfo {
  constructor(name) {
    this.name = name;
    this._defaultLabel = name.toUpperCase().replace(/-/g, '_');
  }

  parse(value, values, argInfo) {
    throw new Error("parse for TypeInfo not implemented");
  }

  requiresArg() {
    return true;
  }
};

class TypeInfoInt extends TypeInfo {
  constructor() {
    super('int');
  }
  parse(value, values, argInfo) {
    const rv = parseInt(value);
    if (isNaN(rv))
      throw new Error('invalid integer');
    return rv;
  }
}

class TypeInfoFloat extends TypeInfo {
  constructor() {
    super('float');
  }
  parse(value, values, argInfo) {
    const rv = parseFloat(value);
    if (isNaN(rv))
      throw new Error('invalid integer');
    return rv;
  }
}

const booleanStrings = {
  true: true, yes: true, t: true, y: true, 1: true,
  false: false, no: false, f: false, n: false, 0: false
};

class TypeInfoFlag extends TypeInfo {
  constructor() {
    super('flag');
  }
  parse(value, values, argInfo) {
    if (value === null)
      return true;

    const rv = booleanStrings[value.toLowerCase()];
    if (rv === undefined)
      throw new Error('error parsing boolean from ' + value);
    return rv;
  }

  requiresArg() {
    return false;
  }
}

class TypeInfoString extends TypeInfo {
  constructor() {
    super('string');
  }
  parse(value) {
    return value;
  }
}

class TypeInfoNoArgCallback extends TypeInfo {
  constructor() {
    super('noarg_callback');
  }
  parse(value, values, argInfo, optionParser) {
    return argInfo.callback(values, argInfo, this, optionParser);
  }
  requiresArg() {
    return false;
  }
}

class TypeInfoArgCallback extends TypeInfo {
  constructor() {
    super('arg_callback');
  }
  parse(value, values, argInfo, optionParser) {
    return argInfo.callback(value, values, argInfo, this, optionParser);
  }
}

class TypeInfoPreset extends TypeInfo {
  constructor() {
    super('preset');
  }
  parse(value, values, argInfo, optionParser) {
    for (const k in argInfo.settings) {
      values[k] = argInfo.settings[k];
    }
    return true;
  }
  requiresArg() {
    return false;
  }
}

// Use OptionParser.registerType() to add
// new types in an application.
const DEFAULT_TYPE_INFO_CLASSES = [
  TypeInfoInt,                  // int
  TypeInfoFloat,                // float
  TypeInfoString,               // string
  TypeInfoFlag,                 // flag
  TypeInfoNoArgCallback,        // noarg_callback
  TypeInfoArgCallback,          // arg_callback
  TypeInfoPreset                // preset
];

function makeBuiltinTypes() {
  const m = {};
  for (const t of DEFAULT_TYPE_INFO_CLASSES) {
    const ti = new t();
    m[ti.name] = ti;
  }
  return m;
}

const builtinTypes = makeBuiltinTypes();

//
// Information about a particular command-line
// argument at runtime.
//
export class ArgInfo
{
  constructor(name, type, description, optionParser) {
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
    this._exclusiveIndices = [];
    this._requiresArg = type.requiresArg();
    this._optionParser = optionParser;
  }

  setMandatory(isM) {
    this._mandatory = (isM === undefined) ? true : isM;
    return this;
  }

  setRepeated(isR) {
    this._repeated = (isR === undefined) ? true : isR;
    return this;
  }

  setHidden(isH) {
    this._hidden = (isH === undefined) ? true : isH;
    return this;
  }

  setTolerateRepeated(isR) {
    this._tolerateRepeated = (isR === undefined) ? true : isR;
    return this;
  }

  setDefaultValue(v) {
    this._defaultValue = v;
    return this;
  }

  setLabel(label) {
    this._argPrototypeLabel = label;
    return this;
  }

  addConstraint(testFunc) {
    this._constraints.push(testFunc);
    return this;
  }

  setMinimum(minimumValue) {
    return this.addConstraint((value) => {
      if (value < minimumValue)
        throw new Error('too small (must be at least ' + minimumValue + ')');
    });
  }

  setStrictMinimum(minimumValue) {
    return this.addConstraint((value) => {
      if (value <= minimumValue)
        throw new Error('too small (must be more than ' + minimumValue + ')');
    });
  };

  setMaximum(maximumValue) {
    return this.addConstraint((value) => {
      if (value > maximumValue)
        throw new Error('too large (must be at most ' + maximumValue + ')');
    });
  };

  setStrictMaximum(maximumValue) {
    return this.addConstraint((value) => {
      if (value >= maximumValue)
        throw new Error('too large (must be less than ' + maximumValue + ')');
    });
  };

  setInterval(a, b) {
    return this.addConstraint((value) => {
      if (value < a || value >= b)
        throw new Error('value is outside of interval [' + a + ', ' + b + ')');
    });
  };

  addShortCode(code) {
    if (this._optionParser.shortCodes[code])
      throw new Error(`short code ${code} already registered`);
    this._shortCodes.push(code);
    this._optionParser.shortCodes[code] = this.name;
  };
}

export function optionNameToJavascriptName_camelCase(name) {
  return name.replace(/-([a-z])/g, (w,p) => p.toUpperCase()).replace('-', '');
}

export function optionNameToJavascriptName_underscore(name) {
  return name.replace(/-/g, '_');
}

/// XXX: replace with leftPad
const spaces = (count) => ' '.repeat(count);

function isTabOrSpace(c) { return c === ' ' || c === '\t'; }
function isTabOrSpaceOrNewline(c) { return c === ' ' || c === '\t' || c === '\n'; }

// whitespace split, but also return individual newlines.
//
// The generated values are either free of whitespace
// or they are exactly "\n".
function* tokenize(text) {
  let at = 0;
  while (at < text.length) {
    while (at < text.length && isTabOrSpace(text[at]))
      at++;
    if (at === text.length)
      return;
    if (text[at] === '\n') {
      at++;
      yield '\n';
      continue;
    }
    const start = at;
    while (at < text.length && !isTabOrSpaceOrNewline(text[at]))
      at++;
    assert(at > start);
    yield text.substring(start, at);
  }
}

function wordwrap(text, width) {
  const tokens = tokenize(text);

  let o = '';
  let t;
  const rv = [];
  while ((t=tokens.next().value) !== undefined) {
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

function formatTwoColumn(leftIndent, leftColumnMax,
                         sep, totalWidth,
                         leftColumn, rightColumn,
                         output) {
  let maxLeftColumnLength = 0;
  for (const col of leftColumn)
    maxLeftColumnLength = Math.max(maxLeftColumnLength, col.length);

  const leftColumnSize = Math.min(maxLeftColumnLength, leftColumnMax);
  const rightColumnSize = totalWidth - leftIndent - leftColumnSize - sep;

  for (let i = 0; i < leftColumn.length; i++) {
    const left = leftColumn[i];
    const righthandLines = wordwrap(rightColumn[i], rightColumnSize);
    let rh_i;
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


export class OptionParser
{
  constructor(options = {}) {
    const {camelCase=true,
           permitArguments=true,
           optionNameToJavascriptName} = options;
    this.jnameToArgInfo = {};
    this.order = [];
    this.types = {};
    this.modes = null;
    this.modeOrder = null;
    this.shortDescription = options.shortDescription;
    this.description = options.description;
    this.shortCodes = {};
    this.isWrapper = false;
    this.exclusives = [];
    this.camelCase = camelCase;
    this.permitArguments = permitArguments;
    this.optionNameToJavascriptName =
        optionNameToJavascriptName ??
        (camelCase ? optionNameToJavascriptName_camelCase
                   : optionNameToJavascriptName_underscore);
  }

  addGeneric(name, type, description) {
    const t = (type instanceof TypeInfo)
            ? type
            : (builtinTypes[type] || this.types[type]);
    assert(t !== undefined);
    const jname = this.optionNameToJavascriptName(name);
    assert(!(jname in this.jnameToArgInfo));
    this.order.push(jname);
    const info = new ArgInfo(name, t, description, this);
    info._requiresArg = t.requiresArg();
    this.jnameToArgInfo[jname] = info;

    // Ignore it if non-argument options (typically flags) are repeated.
    if (!info._requiresArg)
      info._tolerateRepeated = true;

    return info;
  }

  addString(name, description) {
    return this.addGeneric(name, 'string', description);
  }

  addInt(name, description) {
    return this.addGeneric(name, 'int', description);
  }

  addFlag(name, description) {
    return this.addGeneric(name, 'flag', description);
  }

  addFloat(name, description) {
    return this.addGeneric(name, 'float', description);
  }

  addArgCallback(name, label, description, fct) {
    const rv = this.addGeneric(name, 'arg_callback', description)
      .setLabel(label);
    rv.callback = fct;
    return rv;
  }

  addNoArgCallback(name, description, fct) {
    const rv = this.addGeneric(name, 'noarg_callback', description);
    rv._requiresArg = false;
    rv.setTolerateRepeated(true);
    rv.callback = fct;
    return rv;
  }

  addPreset(name, description, settings) {
    const rv = this.addGeneric(name, 'preset', description);
    rv._requiresArg = false;
    rv.settings = settings;
    return rv;
  }

  registerType(typeInfo) {
    const type = typeInfo.name;
    assert(!(type in this.types));
    return this.types[type] = typeInfo;
  }

  addMode(mode, subOptionParser) {
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

  setWrapper(isW) {
    this.isWrapper = isW === undefined ? true : isW;
    return this;
  }

  getUsage(options = {}) {
    const {width = 80,
           optionMaxSize,
           optionDescriptionSep = 2,
           showHidden = false,
           showNonhidden = true} = options;
    const optIndent = 2;
    const optMaxSize = optionMaxSize || Math.ceil(width/5);
    const optSep = optionDescriptionSep || 2;

    const lines = [];

    const maybeBasename = (p) => {
      return path.basename(p);
    };

    const programName = this.programName
                     || (maybeBasename(process.argv[0]) + ' ' + maybeBasename(process.argv[1]));
    const firstLine = 'usage: ' + programName + ' [OPTIONS]';
    if (this.modes) {
      firstLine += ' MODE ...';
    }
    if (this.isWrapper) {
      firstLine += ' PROGRAM PROGRAM_ARGUMENTS...';
    }
    lines.push(firstLine);

    if (this.description) {
      lines.push('');
      wordwrap(this.description, width).forEach(function(descLine) {
        lines.push(descLine);
      });
    }

    if (this.modes) {
      lines.push('');
      lines.push('where MODE is one of:');
      const modeDescriptions = this.modeOrder.map((m) =>
        (this.modes[m].parser.shortDescription || '')
      );
      formatTwoColumn(optIndent, optMaxSize, optSep, width,
                      this.modeOrder, modeDescriptions,
                      lines);
    }

    lines.push('');
    lines.push('options:');
    const optionLeftColumn = [];
    const descColumn = [];
    for (const argJName of this.order) {
      const argInfo = this.jnameToArgInfo[argJName];
      const pieces = ['--' + argInfo.name];
      if (argInfo._hidden) {
        if (!showHidden)
          continue;
      } else {
        if (!showNonhidden)
          continue;
      }
      const typeInfo = builtinTypes[argInfo.type] || this.types[argInfo.type];
      if (argInfo._requiresArg) {
        pieces.push('=');
        pieces.push(argInfo._label ?? argInfo.type._defaultLabel);
      }
      for (const sc of argInfo._shortCodes) {
        pieces.push(' [-' + sc + ']');
      }
      optionLeftColumn.push(pieces.join(''));
      descColumn.push(argInfo.description);
    }
    if (optionLeftColumn.length === 0) {
      lines.push(spaces(optIndent) + 'None');
    }

    formatTwoColumn(optIndent, optMaxSize, optSep, width,
                    optionLeftColumn, descColumn,
                    lines);

    lines.push('');
    return lines.join('\n');
  }

  errorHandler = (errorMessage, argInfo) => {
    console.log('*** ' + errorMessage + '\n\n' + this.getUsage());
    process.exit(1);
  };

  parse(args = process.arggv) {
    const encounteredArgInfoNames = {};
    const exclusivesSatisfied = [];
    this.exclusives.forEach(() => exclusivesSatisfied.push(null));
    this.arguments = [];
    this.values = {};

    for (const jname in this.jnameToArgInfo) {
      const argInfo = this.jnameToArgInfo[jname];
      if (argInfo._repeated) 
        this.values[jname] = [];
    }

    const handleExclusivesByArgInfo = (argInfo) => {
      for (let ei = 0; ei < argInfo._exclusiveIndices.length; ei++) {
        const curArgInfo = exclusivesSatisfied[argInfo._exclusiveIndices[ei]];
        if (curArgInfo !== null && curArgInfo !== argInfo) {
          this.errorHandler('--' + argInfo.name + ' conflicts with --' + curArgInfo.name);
          return false;
        }
        exclusivesSatisfied[argInfo._exclusiveIndices[ei]] = argInfo;
      }
      return true;
    };
    for (let i = 2; i < args.length; i++) {
      const arg = args[i];
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
          let name, arg_value;
          let preparsed = false;
          const eq_index = arg.indexOf('=');
          if (eq_index == -1) {
            name = arg.substring(2);
            arg_value = null;
          } else {
            name = arg.substring(2, eq_index);
            arg_value = arg.substring(eq_index + 1);
          }
          let jname = this.optionNameToJavascriptName(name);
          if (!(jname in this.jnameToArgInfo)) {
            let specialCaseHandled = false;

            if (name.substr(0,3) === 'no-') {
              const jnameSansNo = this.optionNameToJavascriptName(name.substr(3));
              if (this.jnameToArgInfo[jnameSansNo] &&
                  (this.jnameToArgInfo[jnameSansNo].type instanceof TypeInfoFlag)) {
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
                const subop = this.modes[mode].parser;
                console.log('\n--- Options for ' + mode + ' ---');
                console.log(subop.getUsage({showHidden:true}));
              });
              process.exit(0);
              return;
            }
            if (name === 'help-hidden') {
              console.log(this.getUsage({showHidden:true, showNonhidden:false}));
              this.modeOrder.forEach(function (mode) {
                const subop = this.modes[mode];
                console.log('\nOptions for ' + mode);
                console.log(subop.getUsage());
              });
              process.exit(0);
              return;
            }
            if (name.substr(0,5) === 'help-') {
              const helpTopic = node.substr(5);
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
          const argInfo = this.jnameToArgInfo[jname];
          const typeInfo = argInfo.type;
          if (!typeInfo) {
            this.errorHandler('invalid type (' + type + ') of option encountered');
            return null;
          }

          if (arg_value === null && typeInfo.requiresArg()) {
            if (i + 1 == args.length) {
              this.errorHandler('option ' + arg + ' requires argument');
              return null;
            }
            i++;
            arg_value = args[i];
          }
          if (!handleExclusivesByArgInfo(argInfo))
            return null;

          if (!preparsed) {
            try {
              arg_value = typeInfo.parse(arg_value, this.values, argInfo);
            } catch (e) {
              this.errorHandler('error parsing argument ' + arg + ': ' + e);
              return null;
            }
            for (let conIndex = 0; conIndex < argInfo._constraints.length; conIndex++) {
              const constraint = argInfo._constraints[conIndex];
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
          const argInfos = [];
          let nOptionsNeeded = 0;
          for (let shortIndex = 1; shortIndex < arg.length; shortIndex++) {
            const code = arg[shortIndex];
            const longname = this.shortCodes[code];
            if (longname === undefined) {
              this.errorHandler('short-option \'' + code + '\' unknown (in \'' + arg + '\')');
              return null;
            }
            const jname = this.optionNameToJavascriptName(longname);
            const argInfo = this.jnameToArgInfo[jname];
            if (argInfo !== undefined) {
              if (!argInfo._repeated && !argInfo._tolerateRepeated && encounteredArgInfoNames[argInfo.name]) {
                this.errorHandler('got argument ' + argInfo.name + ' multiple times');
                return null;
              }
              encounteredArgInfoNames[argInfo.name] = true;

              //const type = argInfo.type;
              const typeInfo = argInfo.type;
              if (typeInfo.requiresArg())
                nOptionsNeeded++;

              if (!handleExclusivesByArgInfo(argInfo))
                return null;

              argInfos.push([code, argInfo, typeInfo, jname]);
            } else {
              this.errorHandler('short-option \'' + code + '\' maps to unknown --' + longname + ' (in \'' + arg + '\')');
              return null;
            }
          }
          const nArgsAvail = args.length - i - 1;
          if (nOptionsNeeded > nArgsAvail) {
            this.errorHandler('short-option blob \'' + arg + '\' required ' + nOptionsNeeded + ' but only ' + nArgsAvail + ' available');
            return null;
          }
          argInfos.forEach(([shortCode, argInfo, typeInfo, jname]) => {
            if (typeInfo.requiresArg()) {
              ++i;
              try {
                this.values[jname] = typeInfo.parse(args[i], this.values, argInfo);
              } catch (e) {
                errorHandler('processing short-code \'' + shortCode + '\' (aliased to --' + argInfo.name + ') (argument ' + args[i] + '): ' + e);
                return null;
              }
            } else {
              try {
                this.values[jname] = typeInfo.parse(null, this.values, argInfo);
              } catch (e) {
                this.errorHandler('processing short-code \'' + shortCode + '\' (aliased to --' + argInfo.name + '): ' + e);
                return null;
              }
            }
          });
        }
      } else if (this.modes) {
        if (this.modes[arg] === undefined) {
          const msg = 'unknown mode ' + arg + ': expected one of: ' + this.modeOrder.join(' ');
          this.errorHandler(msg);
          return null;
        }
        const modeInfo = this.modes[arg];
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

    for (let ei = 0; ei < this.exclusives.length; ei++) {
      const exInfo = this.exclusives[ei];
      if (exInfo.required && exclusivesSatisfied[ei] === null) {
        const list = [];
        exInfo.optionNames.forEach(function (opname) {
          list.push('--' + opname);
        });
        this.errorHandler('one of ' + list.join(', ') + ' required');
        return null;
      }
    }

    if (this.isWrapper && this.arguments.length === 0) {
      this.errorHandler('expected program name (this is a wrapper program)');
      return null;
    }

    // Look for missing mandatory arguments, and repeated arguments with default values.
    for (const arg in this.jnameToArgInfo) {
      const argInfo = this.jnameToArgInfo[arg];
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
      } else {
        if (argInfo._defaultValue !== undefined && this.values[arg] === undefined) {
          this.values[arg] = argInfo._defaultValue;
        }
      }
    }

    if (this.modes && this.values.mode === undefined) {
      this.errorHandler('no mode give');
      return null;
    }

    return this.values;
  }

  addShortAlias(code, alias) {
    assert(code.length === 1);
    assert(this.shortCodes[code] === undefined);
    const alias_jname = this.optionNameToJavascriptName(alias);
    const arg = this.jnameToArgInfo[alias_jname];
    if (arg) {
      arg._shortCodes.push(code);
      this.shortCodes[code] = alias;
    } else {
      throw new Error('short alias target \'' + alias + '\' does not exist');
    }
    return this;
  }
  setExclusive(required, optionNames)  {
    const argInfos = [];
    const exclusiveIndex = this.exclusives.length;
    optionNames.forEach((opName) => {
      const jname = this.optionNameToJavascriptName(opName);
      const argInfo = this.jnameToArgInfo[jname];
      if (!argInfo) {
        throw new Error('unknown option \'' + opName + '\' given as argument to setExclusive');
      }
      argInfos.push(argInfo);
      argInfo._exclusiveIndices.push(exclusiveIndex);
    });
    this.exclusives.push({
      required: required,
      optionNames: optionNames,
      argInfos: argInfos,
    });
    return this;
  }
}

