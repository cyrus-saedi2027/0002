/* ابزارهای مشترک خط فرمان: رنگ و پرسش (ورودی رمز و کلید پنهان می‌ماند) */
'use strict';
const readline = require('readline');

const green = (s) => `\x1b[32m${s}\x1b[0m`, red = (s) => `\x1b[31m${s}\x1b[0m`, dim = (s) => `\x1b[2m${s}\x1b[0m`, bold = (s) => `\x1b[1m${s}\x1b[0m`;

function ask(q, { hidden = false, def = '' } = {}) {
  return new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      let shown = false;
      rl._writeToOutput = (s) => { if (!shown) { rl.output.write(s); shown = true; } else if (s !== '\r\n' && s !== '\n') rl.output.write('*'); };
    }
    rl.question(q + (def ? dim(` [${def}] `) : ' '), (a) => { rl.close(); if (hidden) process.stdout.write('\n'); res(a.trim() || def); });
  });
}

module.exports = { ask, green, red, dim, bold };
