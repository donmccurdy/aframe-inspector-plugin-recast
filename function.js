const express = require('express');
const bodyParser = require('body-parser');
const assert = require('fluent-assert');
const recast = require('@donmccurdy/recast');
const RecastConfig = require('./src/recast-config');

const PORT = process.env.PORT || 3000;

// ---------------------------------------- //

const app = express();

// ---------------------------------------- //

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use(bodyParser.text({limit: '50mb'}));

app.use(express.static('public'));

// ---------------------------------------- //

app.post('/v1/build/', (req, res) => {

  if (!req.body) return res.sendStatus(400);

  let config;

  try {

    config = RecastConfig.map((param) => {
      assert.ok(param.name, req.query[param.name]);
      const value = Number(req.query[param.name]);
      assert.number(param.name, value).range(param.min, param.max);
      return value;
    });

  } catch (e) {

    console.error(e);
    res.send({ok: false, message: e.message});
    return;

  }

  const input = String(req.body).replace(/\r?\n/g, '@');

  try {

    recast.load(input);

    console.time('recast::build');
    const output = recast.build.apply(recast, config).replace(/@/g, '\n');
    console.timeEnd('recast::build');

    res.send({ok: true, obj: output});

  } catch (e) {

    console.error(e);
    res.send({ok: false, message: 'Failed to build navigation mesh.'});

  }

});

// ---------------------------------------- //

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

// ---------------------------------------- //





