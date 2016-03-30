var OptionParser = require('../lib/daveb-option-parser').OptionParser;
var fs = require('fs');

var optionParser = new OptionParser({
  description: 'read/write a string to a file'
});
optionParser.addString('file', 'file to read/write');

var op_write = new OptionParser({ shortDescription: 'write the file' });
op_write.addString('contents', 'file contents');
optionParser.addMode('write', op_write);

var op_read = new OptionParser({ shortDescription: 'read the file' });
optionParser.addMode('read', op_read);

var options = optionParser.parse();
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
