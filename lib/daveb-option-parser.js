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

export function parseIntOrThrow(s) {
  const rv = parseInt(s);
  if (isNaN(rv))
    throw new Error('bad integer');
  return rv;
}

export function parseFloatOrThrow(s) {
  const rv = parseFloat(s);
  if (isNaN(rv))
    throw new Error('bad float');
  return rv;
}

// =====================================================================
//                              TypeInfo
// =====================================================================
//
// TypeInfo: describes parsing a certain type of value,
// for example, int or float.
//
// You can make custom types if you want.
//
export class TypeInfo {
  constructor(name) {
    this.name = name;
    this.defaultLabel = name.toUpperCase().replace(/-/g, '_');
  }

  parse(value, values, argInfo) {
    throw new Error("parse for TypeInfo not implemented");
  }

  requiresArg() {
    return true;
  }

  // hook run at the end of addGeneric().
  initializeArgInfo(argInfo) {
    // default implementation does nothing. no need to chain.
  }
};

class TypeInfoInt extends TypeInfo {
  constructor() {
    super('int');
  }
  parse(value, values, argInfo) {
    return parseIntOrThrow(value);
  }
}

class TypeInfoFloat extends TypeInfo {
  constructor() {
    super('float');
  }
  parse(value, values, argInfo) {
    return parseFloatOrThrow(value);
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
    Object.assign(values, argInfo.settings);
    return true;
  }
  requiresArg() {
    return false;
  }
}

const enumNormalizers = [
  (str) => str.toLowerCase(),
  (str) => str.toUpperCase(),
];

function isNormalized(normalizer, values) {
  for (const v of values)
    if (normalizer(v) !== v)
      return false;
  return true;
}

export class TypeInfoEnum extends TypeInfo {
  constructor(name, values, normalizer) {
    super(name);
    if (!values)
      throw new Error(`enum '${name}' created with no values`);
    this.values = values;
    if (!normalizer) {
      for (const norm of enumNormalizers) {
        if (isNormalized(norm, values)) {
          normalizer = norm;
          break;
        }
      }
      if (!normalizer)
        normalizer = (x) => x;
    }
    this.valueSet = new Set(values);
    this.normalizer = normalizer;
    assert.equal(this.valueSet.size, values.length);
  }
  parse(value) {
    const v = this.normalizer(value);
    if (!this.valueSet.has(v))
      throw new Error(`bad value for type '${this.name}': ${value}`);
    return v;
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

// =====================================================================
//                              ArgInfo
// =====================================================================
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
    this.mandatory = false;
    this.repeated = false;
    this.tolerateRepeated = false;
    this.hidden = false;
    this.defaultValue = undefined;
    this.label = undefined;

    this.constraints = [];

    // An array of characters (as strings).
    this._shortCodes = [];

    // indexes into the optionParser.exclusives array.
    this._exclusiveIndices = [];
    this.requiresArg = type.requiresArg();
    this._optionParser = optionParser;
    type.initializeArgInfo(this);
  }

  setMandatory(isM) {
    this.mandatory = (isM === undefined) ? true : isM;
    return this;
  }

  setRepeated(isR) {
    this.repeated = (isR === undefined) ? true : isR;
    return this;
  }

  setHidden(isH) {
    this.hidden = (isH === undefined) ? true : isH;
    return this;
  }

  setTolerateRepeated(isR) {
    this.tolerateRepeated = (isR === undefined) ? true : isR;
    return this;
  }

  setDefaultValue(v) {
    this.defaultValue = v;
    return this;
  }

  setLabel(label) {
    this.label = label;
    return this;
  }

  addConstraint(testFunc) {
    this.constraints.push(testFunc);
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
  }

  setMaximum(maximumValue) {
    return this.addConstraint((value) => {
      if (value > maximumValue)
        throw new Error('too large (must be at most ' + maximumValue + ')');
    });
  }

  setStrictMaximum(maximumValue) {
    return this.addConstraint((value) => {
      if (value >= maximumValue)
        throw new Error('too large (must be less than ' + maximumValue + ')');
    });
  }

  setInterval(a, b) {
    return this.addConstraint((value) => {
      if (value < a || value >= b)
        throw new Error('value is outside of interval [' + a + ', ' + b + ')');
    });
  }

  addShortCode(code) {
    if (typeof(code) !== 'string' || code.length !== 1) {
      throw new Error(`short code must be called with a string of length 1 (got '${code}'`);
    }
    if (this._optionParser.shortCodes[code])
      throw new Error(`short code ${code} already registered`);
    this._shortCodes.push(code);
    this._optionParser.shortCodes[code] = this.name;
    return this;
  }
}

function optionNameToCamelCase(name) {
  return name.replace(/-([a-z])/g, (w,p) => p.toUpperCase()).replace('-', '');
}

function optionNameToUnderscore(name) {
  return name.replace(/-/g, '_');
}

function optionNameToKebabCase(name) {
  return name.replace(/-/g, '-');
}

function optionNameToOptionName(name) {
  return name;
}

const optionNameToJavascriptName_functionTable = {
  // --- camel case ---
  camel: optionNameToCamelCase,

  // (alternate names)
  camel_case: optionNameToCamelCase,
  camelCase: optionNameToCamelCase,
  camelcase: optionNameToCamelCase,
  'camel-case': optionNameToCamelCase,

  // --- underscore naming ---
  underscore: optionNameToUnderscore,

  // (alternate names)
  under_score: optionNameToUnderscore,
  underScore: optionNameToUnderscore,
  'under-score': optionNameToUnderscore,

  // --- kebab naming ---
  kebab: optionNameToKebabCase,

  // --- identity naming: exactly as in the command-line arguments
  identity: optionNameToOptionName,
};


const spaces = (count) => ' '.repeat(count);

function isTabOrSpace(c) {
  return c === ' '
      || c === '\t';
}
function isTabOrSpaceOrNewline(c) {
  return c === ' '
      || c === '\t'
      || c === '\n';
}

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

function findOptionNameToJavascriptName(on2jn, camelCase, parentOP) {
  if (typeof(on2jn) === 'function') {
    // hopefully this is a function that takes
    // javascript and returns an option name string.
    return on2jn;
  } else if (typeof(on2jn) === 'string') {
    const convert = optionNameToJavascriptName_functionTable[on2jn];
    if (convert === undefined)
        throw new Error(`optionNameToJavascriptName: bad string '${on2jn}'`);
    return convert;
  } else if (parentOP?.optionNameToJavascriptName) {
    return parentOP?.optionNameToJavascriptName;
  } else {
    return camelCase ? optionNameToCamelCase
                     : optionNameToUnderscore;
  }
}

// =====================================================================
//                              OptionParser
// =====================================================================
//
/* node:coverage disable */
function defaultErrorHandler(errorMessage, argInfo) {
  console.log('*** ' + errorMessage + '\n\n' + this.getUsage());
  process.exit(1);
}
/* node:coverage enable */

export class OptionParser
{
  constructor(options = {}) {
    const {camelCase=true,
           permitArguments=false,
           errorHandler,
           programName,
           optionNameToJavascriptName} = options;
    this.jnameToArgInfo = {};
    this.order = [];
    this.types = {};
    this.modes = null;
    this.modeAliases = null;
    this.modeOrder = null;
    this.shortDescription = options.shortDescription;
    this.description = options.description;
    this.shortCodes = {};
    this.isWrapper = false;
    this.programName = programName;
    this.exclusives = [];

    // may be: true, false, a TypeInfo, or an array of TypeInfo.
    this.permittedArgs = false;

    this.parent = options.parent;
    this.optionNameToJavascriptName = findOptionNameToJavascriptName(optionNameToJavascriptName, camelCase, options.parent);
    if (options.usageHandler) {
      this.usageHandler = options.usageHandler;
    } else if (!options.parent) {
      this.usageHandler = (msg) => { console.log(msg); process.exit(0); };
    }
    if (permitArguments) {
      this.permitArguments(permitArguments);
    }
    if (options.types) {
      for (const ty of options.types)
        this.registerType(ty);
    }
    if (options.args) {
      for (const {name, type, description, ...extraOptions} of options.args) {
        this.addGeneric(name, type, description, extraOptions);
      }
    }
    this.errorHandler = errorHandler
                     ?? this.parent?.errorHandler
                     ?? defaultErrorHandler;
  }

  _handleUsage(message) {
    let op = this;
    while (!op.usageHandler) {
      op = op.parent;
    }
    return op.usageHandler(message);
  }

  setUsageHandler(handler) {
    this.usageHandler = handler;
  }

  addGeneric(name, type, description, argOptions) {
    const t = this.lookupTypeInfoOrThrow(type);
    const jname = this.optionNameToJavascriptName(name);
    if (jname in this.jnameToArgInfo) {
      throw new Error(`adding ${name} ${type}: already have an option with the same name or target`);
    }
    this.order.push(jname);
    const info = new ArgInfo(name, t, description, this);
    this.jnameToArgInfo[jname] = info;

    // Ignore it if non-argument options (typically flags) are repeated.
    if (!info.requiresArg)
      info.tolerateRepeated = true;

    if (argOptions) {
      const {shortCodes, ...extraOptions} = argOptions;
      for (let key in extraOptions) 
        info[key] = extraOptions[key];
      if (shortCodes) {
        for (const shortCode of shortCodes) {
          assert(shortCode.length === 1);
          info.addShortCode(shortCode);
        }
      }
    }

    return info;
  }

  addString(name, description, argOptions) {
    return this.addGeneric(name, 'string', description, argOptions);
  }

  addInt(name, description, argOptions) {
    return this.addGeneric(name, 'int', description, argOptions);
  }

  addFlag(name, description, argOptions) {
    return this.addGeneric(name, 'flag', description, argOptions);
  }

  addFloat(name, description, argOptions) {
    return this.addGeneric(name, 'float', description, argOptions);
  }

  addArgCallback(name, label, description, fct, argOptions) {
    const rv = this.addGeneric(name, 'arg_callback', description, argOptions)
      .setLabel(label);
    rv.callback = fct;
    return rv;
  }

  addNoArgCallback(name, description, fct, argOptions) {
    const rv = this.addGeneric(name, 'noarg_callback', description, argOptions);
    rv.callback = fct;
    return rv;
  }

  addPreset(name, description, settings, argOptions) {
    const rv = this.addGeneric(name, 'preset', description, argOptions);
    rv.settings = settings;
    return rv;
  }

  registerType(arg) {
    const typeInfo = (arg instanceof TypeInfo)
                   ? arg
                   : new arg();
    const type = typeInfo.name;
    assert(!(type in this.types));
    return this.types[type] = typeInfo;
  }

  // arg1 is the options for a new OptionParser
  // arg2 is a optional function that modifies the sub-OptionParser.
  //
  // For compatibility, arg1 may simply be an OptionParser,
  // but it's not recommended.
  addMode(mode,
          arg1,
          updateOptionParserFunc) {
    if (!this.modes) {
      this.modes = {};
      this.modeOrder = [];
    }

    if (mode in this.modes) {
      throw new Error(`mode ${mode} already registered`);
    }
    if (this.modeAliases && (mode in this.modeAliases)) {
      throw new Error(`mode ${mode} already registered as an alias`);
    }

    let subOptionParser;
    if (arg1 instanceof OptionParser)  {
       // If given an OptionParser, simply
        // set its parent element, failing if
        // it's already set.
      assert(!arg1.parent);
      arg1.parent = this;
      subOptionParser = arg1;
      this.modes[mode] = {
        name: mode,
        modeJavascriptName: this.optionNameToJavascriptName(mode),
        parser: subOptionParser
      };
    } else {
      // otherwise, create a new OptionParser with
      // the given options, and parent=this.
      const {modeJavascriptName, ...optionParserInitOptions} = arg1;
      subOptionParser = new OptionParser({parent:this, ...optionParserInitOptions});
      this.modes[mode] = {
        name: mode,
        modeJavascriptName: modeJavascriptName ?? this.optionNameToJavascriptName(mode),
        parser: subOptionParser
      };
    }

    if (updateOptionParserFunc !== undefined) {
      assert(typeof(updateOptionParserFunc) === 'function');
      updateOptionParserFunc(subOptionParser);
    }

    this.modeOrder.push(mode);
  }

  addModeAlias(newMode, origMode) {
    if (!this.modes || !(origMode in this.modes)) {
      throw new Error(`original mode ${origMode} not available`);
    }
    if (newMode in this.modes) {
      throw new Error(`new mode ${newMode} already registered`);
    }
    this.modeAliases ??= {};
    if (newMode in this.modeAliases) {
      throw new Error(`new mode ${newMode} already registered as an alias`);
    }
    this.modeAliases[newMode] = origMode;
  }

  setWrapper(isW) {
    this.isWrapper = isW === undefined ? true : isW;
    return this;
  }

  lookupTypeInfo(name) {
    if (name instanceof TypeInfo)
      return name;
    for (let op = this; op; op = op.parent) {
      const type = op.types[name];
      if (type)
        return type;
    }
    return builtinTypes[name];
  }

  lookupTypeInfoOrThrow(name) {
    const rv = this.lookupTypeInfo(name);
    if (!rv)
      throw new Error(`cannot find type named '${name}'`);
    return rv;
  }

  /** Adjusts how unknown non-option argument handling occurs.
   *  (It is a non-option because it doesn't start with a '-'
   *  and there's no '--' to terminate command-line handling)
   */
  permitArguments(argspec, label) {
    if (argspec === undefined) {
      this.permittedArgs = true;
    } else if (typeof(argspec) === 'boolean') {
      this.permittedArgs = argspec;
    } else if (typeof(argspec) === 'string') {
      this.permittedArgs = this.lookupTypeInfo(argspec);
      if (!this.permittedArgs) {
        throw new Error(`unknown type name ${argspec} to permitArguments`);
      }
    } else if (argspec instanceof TypeInfo) {
      this.permittedArgs = argspec;
    } else if (Array.isArray(argspec)) {
      this.permittedArgs = argspec.map(n => this.lookupTypeInfoOrThrow(n));
    } else {
      throw new Error(`unexpected type passed to permitArguments() (${argspec})`);
    }
    if (label)
      this.permittedArgsLabel = label;
  }

  _getModeStack() {
    let op = this;
    const modes = [];
    while (op.parent) {
      for (let k in op.parent.modes) {
        if (op.parent.modes[k].parser === op)
          modes.push(k);
      }
      op = op.parent;
    }
    return modes.reverse().join(' ');
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

    const programName = options.programName
                     ?? this.programName
                     ?? (maybeBasename(process.argv[0]) + ' ' + maybeBasename(process.argv[1]));
    let firstLine = 'usage: ' + programName;
    if (this.parent) {
      firstLine += ' ' + this._getModeStack();
    }
    if (this.order.length > 0)
      firstLine += ' [OPTIONS]';
    if (this.modes) {
      firstLine += ' MODE ...';
    } else if (this.isWrapper) {
      firstLine += ' PROGRAM PROGRAM_ARGUMENTS...';
    } else if (this.permittedArgs) {
      if (this.permittedArgsLabel) {
        firstLine += ' ' + this.permittedArgsLabel;
      } else {
        if (this.permittedArgs === true) {
          firstLine += ' ARGUMENTS...';
        } else if (this.permittedArgs instanceof TypeInfo) {
          firstLine += ' ' + this.permittedArgs.defaultLabel + "...";
        } else if (Array.isArray(this.permittedArgs)) {
          firstLine += ' ' + this.permittedArgs.map(ti => ti.defaultLabel).join(' ');
        } else {
          throw new Error("permittedArgs of invalid type");
        }
      }
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
      if (argInfo.hidden) {
        if (!showHidden)
          continue;
      } else {
        if (!showNonhidden)
          continue;
      }
      const typeInfo = this.lookupTypeInfo(argInfo.type);
      if (argInfo.requiresArg) {
        pieces.push('=');
        pieces.push(argInfo.label ?? argInfo.type.defaultLabel);
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

  dumpModeTree(indent, lines) {
    const ind = spaces(indent);
    if (this.modeOrder) {
      for (const mode of this.modeOrder) {
        const sub = this.modes[mode].parser;
        const desc = sub.shortDescription ?? sub.description;
        lines.push(`${ind}${mode}: ${desc}`);
        this.modes[mode].parser.dumpModeTree(indent + 2, lines);
      }
    }
  }

  // === OptionParser.parse() ===
  parse(args = process.argv) {
    const encounteredArgInfoNames = {};
    const exclusivesSatisfied = [];
    this.exclusives.forEach(() => exclusivesSatisfied.push(null));
    this.values = {};
    if (this.isWrapper || this.permittedArgs) {
      this.values.arguments = [];
    }

    for (const jname in this.jnameToArgInfo) {
      const argInfo = this.jnameToArgInfo[jname];
      if (argInfo.repeated) 
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
        if (!this.isWrapper && !this.permittedArgs) {
          this.errorHandler('encountered --, but arguments are not allowed');
          return null;
        }
        for (i++; i < args.length; i++) {
          if (this.isWrapper)
            this.values.arguments.push(args[i]);
          else {
            if (!this._handlePermittedArg(args[i]))
              return null;
          }
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
              return this._handleUsage(this.getUsage());;
            }
            if (name === 'help-all') {
              const lines = [this.getUsage({showHidden:true})];
              if (this.modeOrder) {
                for (const mode of this.modeOrder) {
                  const subop = this.modes[mode].parser;
                  lines.push('\n--- Options for ' + mode + ' ---');
                  lines.push(subop.getUsage({showHidden:true}));
                }
              }
              return this._handleUsage(lines.join("\n"));
            }
            if (name === 'help-hidden') {
              const lines = [this.getUsage({showHidden:true, showNonhidden:false})];
              return this._handleUsage(lines.join("\n"));
            } else if (name === 'help-mode-tree') {
              const lines = [];
              this.dumpModeTree(0, lines);
              return this._handleUsage(lines.join("\n"));
            } else if (name.substr(0,5) === 'help-') {
              const helpTopic = name.substr(5);
              if (this.modes && (helpTopic in this.modes)) {
                return this._handleUsage(this.modes[helpTopic].parser.getUsage());
              } else {
                this.errorHandler(`unknown help topic '${helpTopic}'`);
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
          assert(typeInfo);

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
              this.errorHandler(`error parsing argument ${arg}: ${e}`);
              return null;
            }
            for (let conIndex = 0; conIndex < argInfo.constraints.length; conIndex++) {
              const constraint = argInfo.constraints[conIndex];
              try {
                constraint(arg_value, argInfo, typeInfo);
              } catch (e) {
                this.errorHandler(`bad value for ${name}: ${e}`);
                return null;
              }
            }
          }
          if (!argInfo.repeated && !argInfo.tolerateRepeated && encounteredArgInfoNames[argInfo.name]) {
            this.errorHandler(`got argument ${argInfo.name} multiple times`);
            return null;
          }
          encounteredArgInfoNames[argInfo.name] = true;

          if (argInfo.repeated)
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
              this.errorHandler(`short-option '${code}' unknown (in '${arg}')`);
              return null;
            }
            const jname = this.optionNameToJavascriptName(longname);
            const argInfo = this.jnameToArgInfo[jname];
            if (argInfo !== undefined) {
              if (!argInfo.repeated && !argInfo.tolerateRepeated && encounteredArgInfoNames[argInfo.name]) {
                this.errorHandler(`got argument ${argInfo.name} multiple times`);
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
              this.errorHandler(`short-option '${code}' maps to unknown --${longname}  (in '${arg}')`);
              return null;
            }
          }
          const nArgsAvail = args.length - i - 1;
          if (nOptionsNeeded > nArgsAvail) {
            this.errorHandler(`short-option blob '${arg}' required ${nOptionsNeeded} but only ${nArgsAvail} available`);
            return null;
          }
          for (const [shortCode, argInfo, typeInfo, jname] of argInfos) {
            if (typeInfo.requiresArg()) {
              ++i;
              try {
                this.values[jname] = typeInfo.parse(args[i], this.values, argInfo);
              } catch (e) {
                this.errorHandler(`processing short-code '${shortCode}' (aliased to --${argInfo.name}) (argument ${args[i]}): ${e}`);
                return null;
              }
            } else {
              try {
                this.values[jname] = typeInfo.parse(null, this.values, argInfo);
              } catch (e) {
                this.errorHandler(`processing short-code '${shortCode}' (aliased to --${argInfo.name}): ${e}`);
                return null;
              }
            }
          };
        }
      } else if (this.modes) {
        const modeName = (this.modeAliases && this.modeAliases[arg]) ?? arg;
        const modeInfo = this.modes[modeName];
        if (!modeInfo) {
          const modesStr = this.modeOrder.join(' ');
          this.errorHandler(`unknown mode ${arg}: expected one of: ${modesStr}`);
          return null;
        }
        this.values.mode = modeName;
        this.values[modeInfo.modeJavascriptName] = modeInfo.parser.parse(['node', args[1]].concat(args.slice(i + 1)));
        if (!this.values[modeInfo.modeJavascriptName]) {
          this.errorHandler('error parsing submode ' + arg);
          return null;
        }
        if (!this.parent) {
          const names = [];
          let op = this;
          for (let at = this.values; at.mode !== undefined; ) {
            const modeInfo = op.modes[at.mode];
            names.push(at.mode);
            at = at[modeInfo.modeJavascriptName];
            op = modeInfo.parser;
          }
          this.values.fullMode = names.join('/');
        }
        i = args.length;
        break;            // submode handles ALL remaining arguments
      } else if (this.isWrapper) {
        for (  ; i < args.length; i++) 
          this.values.arguments.push(args[i]);
        break;
      } else {
        if (!this.permittedArgs) {
          this.errorHandler('unexpected argument \'' + arg + '\'');
          return null;
        }
        if (!this._handlePermittedArg(arg)) {
          return null;
        }
      }
    }

    if (Array.isArray(this.permittedArgs)) {
      if (this.values.arguments.length < this.permittedArgs.length) {
        const progName = this.parent
                       ? args[1] + " " + this._getModeStack()
                       : args[1];
        this.errorHandler(`expected ${this.permittedArgs.length} args to ${progName} but only got ${this.values.arguments.length}`);
        return null;
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

    if (this.isWrapper && this.values.arguments.length === 0) {
      this.errorHandler('expected program name (this is a wrapper program)');
      return null;
    }

    // Look for missing mandatory arguments, and repeated arguments with default values.
    for (const arg in this.jnameToArgInfo) {
      const argInfo = this.jnameToArgInfo[arg];
      if (argInfo.mandatory) {
        if (argInfo.repeated) {
          if (this.values[arg].length === 0) {
            this.errorHandler(`missing mandatory repeated argument --${argInfo.name}`);
            return null;
          }
        } else {
          if (!(arg in this.values)) {
            this.errorHandler(`missing mandatory argument --${argInfo.name}`);
            return null;
          }
        }
      } else if (argInfo.repeated) {
        if (argInfo.defaultValue !== undefined && this.values[arg].length === 0) {
          this.values[arg] = argInfo.defaultValue;
        }
      } else {
        if (argInfo.defaultValue !== undefined && this.values[arg] === undefined) {
          this.values[arg] = argInfo.defaultValue;
        }
      }
    }

    if (this.modes && this.values.mode === undefined) {
      const modes = Object.keys(this.modes).join(' ');
      this.errorHandler(`no mode given (available modes: ${modes})`);
      return null;
    }

    return this.values;
  }

  _handlePermittedArg(arg) {
    if (this.permittedArgs === true) {
      this.values.arguments.push(arg);
    } else if (Array.isArray(this.permittedArgs)) {
        const nargs = this.values.arguments.length;
        if (nargs >= this.permittedArgs.length) {
          this.errorHandler(`more arguments than ${this.permittedArgs.length} given`);
          return false;
        }
        const typeInfo = this.permittedArgs[nargs];
        this.values.arguments.push(typeInfo.parse(arg, this.values, null));
    } else if (this.permittedArgs instanceof TypeInfo) {
        const typeInfo = this.permittedArgs;
        this.values.arguments.push(typeInfo.parse(arg, this.values, null));
    } else {
        this.errorHandler('internal error handling extra arg: ' + arg);
        return false;
    }
    return true;
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

