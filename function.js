const express = require('express');
const bodyParser = require('body-parser');
const recast = require('@donmccurdy/recast');

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

// ---------------------------------------- //

app.post('/v1/build/', (req, res) => {

  if (!req.body) return res.sendStatus(400);

  const config =[
    req.query.cellSize,
    req.query.cellHeight,
    req.query.agentHeight,
    req.query.agentRadius,
    req.query.agentMaxClimb,
    req.query.agentMaxSlope
  ].map(Number);

  const input = String(req.body).replace(/\r?\n/g, '@');

  try {

    recast.load(input);

    console.time('recast::build');
    const output = recast.build.apply(recast, config).replace(/@/g, '\n');
    console.timeEnd('recast::build');

    res.send({ok: true, obj: output});

  } catch (e) {

    console.error(e);
    res.send({ok: false});

  }

});

// ---------------------------------------- //

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

// ---------------------------------------- //





