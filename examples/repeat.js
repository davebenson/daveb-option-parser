import {OptionParser} from '../lib/daveb-option-parser.js';
import {spawn} from 'node:child_process';

//
// Async function to run a child program and wait for it to end.
// 
function runCommand(args) {
  return new Promise((res, rej) => {
    spawn(args[0], args.slice(1), { stdio: 'inherit' })
      .on('close', (code) => (code === 0) ? res() : rej(code));
  });
}

//
// Specify argument parsing.
//
const optionParser = new OptionParser({
  description: 'Run a program repeatedly'
});
optionParser.addInt('count', 'number of times to run')
            .setMinimum(0)
            .addShortCode('n');
optionParser.setWrapper(true);

//
// Parse options or terminate.
//
const opt = optionParser.parse();

//
// The actual body of the program.
//
for (let i = 0; i < opt.count; i++) {
  await runCommand(opt.arguments);
}
