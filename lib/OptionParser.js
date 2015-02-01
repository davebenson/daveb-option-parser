var assert = require("assert");

function ArgInfoRef(name, info) {
  this.name = name;
  this.info = info;
}

ArgInfoRef.prototype.mandatory = function(isM) {
  this.info.mandatory = !!isM;
  return this;
};

ArgInfoRef.prototype.negate = function() {
  assert(this.info.type === 'flag');
  this.info.negate = true;
  return this;
};

ArgInfoRef.prototype.argPrototypeLabel = function(label) {
  this.info.argPrototypeLabel = label;
  return this;
};

function OptionParser()
{
  this.info = {};
  this.order = [];
  this.types = {};
};


OptionParser.prototype.normalizeArgName = function(name)
{
  return name.replace(/-/g, '_');
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
  assert(!(name in this.info));
  var nname = this.normalizeArgName(name);
  this.order.push(nname);
  var info = {type:type, name:name, description:description};
  this.info[nname] = info;
  return new ArgInfoRef(name, info);
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
        if (!(nname in this.info)) {
          var specialCaseHandled = false;

          if (name.substr(0,3) === 'no-') {
            var nnameSansNo = nname.substr(3);
            if (this.info[nnameSansNo] &&
                this.info[nnameSansNo].type === 'flag') {
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
        if (arg_value === null && type_requires_arg(this.info[nname].type)) {
          if (i + 1 == args.length) {
            this.errorHandler("option " + arg + " requires argument");
            return null;
          }
          i++;
          arg_value = args[i];
        }

        var type = this.info[nname].type;
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
  for (var arg in this.info) {
    if (this.info[arg].mandatory && !(arg in this.values)) {
      this.errorHandler("missing mandatory argument --" + this.info[arg].name);
      return null;
    }
  }
  return this.values;
};

module.exports = OptionParser;
