import babelCore from 'next/dist/compiled/babel/core.js';
import reactPreset from 'next/dist/compiled/babel/preset-react.js';

const { transformFileSync } = babelCore;
const files = process.argv.slice(2);
let hasError = false;
for (const file of files) {
  try {
    transformFileSync(file, { presets: [reactPreset], babelrc: false, configFile: false });
    console.log('OK:', file);
  } catch (err) {
    hasError = true;
    console.error('FAIL:', file, '—', err.message.split('\n')[0]);
  }
}
process.exit(hasError ? 1 : 0);
