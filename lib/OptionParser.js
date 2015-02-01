var assert = require("assert");

function ArgInfo(name, type) 
{
  this._name = name;
  this._type = type;
  this._mandatory = false;
  this._defaultValue = undefined;
  this._argPrototypeLabel = undefined;
}

ArgInfo.prototype.setMandatory = function(isM) {
  this._mandatory = (isM === undefined) ? true : isM;
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

function OptionParser()
{
  this.nnameToArgInfo = {};
  this.order = [];
  this.types = {};
  this.camelCase = false;
};

OptionParser.prototype.normalizeArgName = function(name)
{
  if (this.camelCase) {
    return name.replace(/-([a-z])/g, function(w,p) { return p.toUpperCase() }).replace('-', '');
  } else {
    return name.replace(/-/g, '_');
  }
}
var booleanStrings = {
  true: true, TRUE: true, yes: true, t: true, y: true, Y: true, 1: true,
  false: false, FALSE: false, no: false, f: false, n: false, N: false, 0: false
};
OptionParser.prototype.parseBoolean = function(value)
{
  switch (typeof(value)) {
    case 'boolean': return value;
    case 'number': return value != 0;
    case 'string': {
      var rv = booleanStrings[value];
      if (rv === undefined)
        throw new Error('error parsing boolean from ' + value);
      return rv;
    }
    default:
      throw new Error('bad type (' + typeof(value) + ') to parseBoolean');
  }
};

OptionParser.prototype._add = function(name, type, description)
{
  var nname = this.normalizeArgName(name);
  assert(!(nname in this.nnameToArgInfo));
  this.order.push(nname);
  var info = new ArgInfo(name, type, description);
  this.nnameToArgInfo[nname] = info;
  return info;
};

OptionParser.prototype.addString = function(name, description)
{
  return this._add(name, "string", description);
};

OptionParser.prototype.addInt = function(name, description)
{
  return this._add(name, "int", description);
};

OptionParser.prototype.addFlag = function(name, description)
{
  return this._add(name, "flag", description);
};

OptionParser.prototype.registerType = function(type, default_label, parseFunc)
{
  this.types[type] = {
    label: default_label,
    parser: parseFunc
  };
}

OptionParser.prototype.addGeneric = function(name, type, description)
{
  assert(type in this.types);
  return this._add(name, type, description);
}

function type_requires_arg(type)
{
  return type != 'flag';
}

OptionParser.prototype.getUsage = function()
{
  var lines = ["usage:"];
  for (var i = 0; i < this.order.length; i++) {
    var arg_info = this.info[this.order[i]];
    var l = "  --" + arg_info.name;
    switch (arg_info.type) {
      case 'string': l += "=STR"; break;
      case 'int': l += "=INT"; break;
    }
    if (l.length < 20) {
      while (l.length < 20)
        l += " ";
      lines.push(l + " " + arg_info.description);
    } else {
      lines.push(l);
      lines.push("                     " + arg_info.description);
    }
  }
  lines.push("");
  return lines.join("\n");
};

OptionParser.prototype.errorHandler = function(errorMessage, argInfo) {
  console.log(str);
  console.log(this.get_usage());
  process.exit(1);
};

OptionParser.prototype.parse = function(args)
{
  var args = args || process.argv;
  this.arguments = [];
  this.values = {};

  // Handle default values.
  for (var nname in this.nnameToArgInfo) {
    if (this.nnameToArgInfo[nname]._defaultValue !== undefined) {
      this.values[nname] = this.nnameToArgInfo[nname]._defaultValue;
    }
  }

  for (var i = 2; i < args.length; i++) {
    var arg = args[i];
    if (arg == "--") {
      for (i++; i < args.length; i++) {
        this.arguments.push(args[i]);
      }
      break;
    } else if (arg[0] == '-') {
      if (arg == '-') {
        this.arguments.push("-");
      } else if (arg[1] == '-') {
        // long option
        var name, arg_value;
        var eq_index = arg.indexOf("=");
        if (eq_index == -1) {
          name = arg.substring(2);
          arg_value = null;
        } else {
          name = arg.substring(2, eq_index);
          arg_value = arg.substring(eq_index + 1);
        }
        var nname = this.normalizeArgName(name);
        if (!(nname in this.nnameToArgInfo)) {
          var specialCaseHandled = false;

          if (name.substr(0,3) === 'no-') {
            var nnameSansNo = this.normalizeArgName(name.substr(3));
            if (this.nnameToArgInfo[nnameSansNo] &&
                this.nnameToArgInfo[nnameSansNo]._type === 'flag') {
              nname = nnameSansNo;
              arg_value = false;
              specialCaseHandled = true;
            }
          }

          if (!specialCaseHandled) {
            this.errorHandler("unknown option: '" + arg + "'", null);
            return null;
          }
        }
        var type = this.nnameToArgInfo[nname]._type;
        if (arg_value === null && type_requires_arg(type)) {
          if (i + 1 == args.length) {
            this.errorHandler("option " + arg + " requires argument");
            return null;
          }
          i++;
          arg_value = args[i];
        }

        switch (type) {
          case 'flag':
            if (arg_value !== null) {
              var b = this.parseBoolean(arg_value);
              if (b === null) {
                this.errorHandler("bad value for boolean option: '" + arg_value + "'");
                return null;
              }
              this.values[nname] = b;
            } else {
              this.values[nname] = true;
            }
            break;

          case 'string':
            this.values[nname] = arg_value;
            break;

          case 'int':
            this.values[nname] = parseInt(arg_value);
            break;

          default: 
            var type_info = this.types[type];
            if (type_info === undefined) {
              this.errorHandler("unknown argument type " + type + " for arg '" + arg + "'");
              return null;
            }
            var parser = type_info.parser;

            try {
              this.values[nname] = parser(arg_value, this.info[nname], type_info);
            } catch (e) {
              this.errorHandler("parsing argument '" + arg + "': " + e);
              return null;
            }
            break;
        }
          
      } else {
        // short option
        assert(false);  // not supported for now
      }
    }
  }
  for (var arg in this.nnameToArgInfo) {
    if (this.nnameToArgInfo[arg]._mandatory && !(arg in this.values)) {
      this.errorHandler("missing mandatory argument --" + this.nnameToArgInfo[arg].name);
      return null;
    }
  }
  return this.values;
};

module.exports = OptionParser;
