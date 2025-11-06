import {OptionParser, TypeInfo} from '../lib/daveb-option-parser.js';

const optionParser = new OptionParser({
  description: 'Add two 3-d vectors'
});
class TypeInfoVector3 extends TypeInfo {
  constructor() {
    super('vector3');
  }
  parse(value) {
    const rv = value.split(',').map(parseFloat);
    if (rv.length != 3)
      throw new Error('expected x,y,z');
    return rv;
  }
}
optionParser.registerType(new TypeInfoVector3());
optionParser.addGeneric('a', 'vector3', 'addend 1').setMandatory();
optionParser.addGeneric('b', 'vector3', 'addend 2').setMandatory();
const options = optionParser.parse();  // terminates if there are problems

// main program
const a = options.a;
const b = options.b;
const sum = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
console.log(sum.join(','));
