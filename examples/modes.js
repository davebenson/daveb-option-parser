import {OptionParser} from '../lib/daveb-option-parser.js';
import fs from 'node:fs';

const optionParser = new OptionParser({
  description: 'read/write a string to a file'
});
optionParser.addString('file', 'file to read/write');

const op_write = new OptionParser({ shortDescription: 'write the file' });
op_write.addString('contents', 'file contents');
optionParser.addMode('write', op_write);

const op_read = new OptionParser({ shortDescription: 'read the file' });
optionParser.addMode('read', op_read);

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
    fs.writeFile(options.file, options.modeValues.contents, {encoding:'utf8'}, function (err) {
      if (err) {
        throw err;
      }
    });
    break;
  }
}
