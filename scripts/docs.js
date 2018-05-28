const replace = require('replace');
const config = require('../src/recast-config');

const rows = config.map((p) => {
  return `| ${p.name} | ${p.default} | ${p.min} — ${p.step} | ${p.description} |`;
});

const content = `| property | default | range | description |
|----------|---------|-------|-------------|
${rows.join('\n')}`;

replace({
  regex: /(<\!-- begin:config -->)(?:[\s\S]+)(<!-- end:config -->)/,
  replacement: `$1\n${content}\n$2`,
  paths: ['README.md'],
  silent: true
});
