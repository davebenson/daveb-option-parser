
import {OptionParser, TypeInfo, TypeInfoEnum} from '../lib/daveb-option-parser.js';

function parseFloatOrThrow(str) {
  const rv = parseFloat(str);
  if (isNaN(rv))
    throw "not a number parsing float";
  return rv;
}

class TypeInfoVec3 extends TypeInfo {
  constructor() {
    super("vec3");
  }
  parse(value) {
    const strs = value.split(",");
    if (strs.length != 3) {
      throw new Error(`3-vector had ${strs.length} elements`);
    }
    return strs.map(parseFloatOrThrow);
  }
}

const optionParser = new OptionParser({
  description: 'Various math operations'
});

function dot3([a1,a2,a3],[b1,b2,b3]) {
  return a1*b1 + a2*b2 + a3*b3;
}

function Lp_norm([x,y,z], p) {
  return Math.pow(Math.pow(x,p) + Math.pow(y,p) + Math.pow(z,p), 1/p);
}

const normFunctions = {
  norm: (v) => Math.sqrt(dot3(v,v)),
  squared: (v) => dot3(v,v),
  max: (v) => Math.max(v[0],v[1],v[2]),
  abs: (v) => Math.abs(v[0]) + Math.abs(v[1]) + Math.abs(v[2]),
  l3: (v) => Lp_norm(v,3),
  geo: (v) => Math.cbrt(v[0] * v[1] * v[2]),
  harmonic: (v) => 3 / (1/v[0] + 1/v[1] + 1/v[2])

};

optionParser.addFlag('debug', 'enable debug prints');

optionParser.addMode('vec3', {
  description: '3-vector operations'
}, (op) => {
  op.registerType(TypeInfoVec3);
  op.addMode('add', {
    description: 'add vectors',
    permitArguments: 'vec3'
  });
  op.addMode('cross', {
    description: 'cross-product of vectors',
    permitArguments: ['vec3', 'vec3']
  });
  op.addMode('norm', {
    description: 'norm of vector',
    permitArguments: ['vec3'],
    types: [
      new TypeInfoEnum('norm_type', Object.keys(normFunctions)),
    ],
    args: [
      { name: 'type',
        type: 'norm_type',
        description: 'type of norm to calculate',
      },
      { name: 'list-types',
        type: 'noarg_callback',
        description: 'print list of norm types',
        callback: () => {
          console.log(Object.keys(normFunctions).join(' '));
          process.exit(0);
        }
      }
    ]
  });
});

const values = optionParser.parse();
if (values.debug)
  console.log(values);

function cross([a1,a2,a3], [b1,b2,b3]) {
  return [
    a2*b3-a3*b2,
    a3*b1-a1*b3,
    a1*b2-a2*b1
  ];
}

switch (values.fullMode) {
  case 'vec3/add': {
    const v = [0,0,0];
    for (const [x,y,z] of values.vec3.add.arguments) {
      v[0] += x;
      v[1] += y;
      v[2] += z;
    }
    console.log(v.join(' '));
    break;
  }
  case 'vec3/norm': {
    const v = values.vec3.norm.arguments[0];
    const n = normFunctions[values.vec3.norm.type](v);
    console.log(n);
    break;
  }
  case 'vec3/cross': {
    const [a,b] = values.vec3.cross.arguments;
    console.log(cross(a,b));
    break;
  }
}
