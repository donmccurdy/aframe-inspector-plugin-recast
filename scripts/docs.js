const replace = require('replace');
const config = require('../src/recast-config');

let content = `| property | default | range | description |
|----------|---------|-------|-------------|
`;

config.forEach((p) => {
  content += `| ${p.name} | ${p.default} | ${p.min} — ${p.step} | ${p.description} |`;
});

replace({
  regex: /(<\!-- begin:config -->)(?:[\s\S]+)(<!-- end:config -->)/,
  replacement: `$1\n${content}\n$2`,
  paths: ['README.md'],
  silent: true
});
