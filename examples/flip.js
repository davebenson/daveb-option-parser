import {OptionParser} from '../lib/daveb-option-parser.js';

const optionParser = new OptionParser({
  description: 'Flip a weighted coin'
});
optionParser.addFloat('prob', 'probability of heads')
                .setDefaultValue(0.5)
                .setMinimum(0.0)
                .setMaximum(1.0)
                .addShortCode('p');
const options = optionParser.parse();
console.log(Math.random() < options.prob ? 'HEAD' : 'TAILS');


