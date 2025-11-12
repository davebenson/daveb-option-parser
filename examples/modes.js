import {OptionParser} from '../lib/daveb-option-parser.js';
import fs from 'node:fs';

const optionParser = new OptionParser({
  description: 'read/write a string to a file'
});
optionParser.addString('file', 'file to read/write');

optionParser.addMode('write', {
                       shortDescription: 'write the file'
                     }, (op) => {
                       op.addString('contents', 'file contents');
                     });

optionParser.addMode('read', {
                       shortDescription: 'read the file'
                     });

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
  }
  case 'write': {
    fs.writeFile(options.file, options.write.contents, {encoding:'utf8'}, function (err) {
      if (err) {
        throw err;
      }
    });
    break;
  }
}
