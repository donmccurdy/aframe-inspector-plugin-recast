const express = require('express');
const bodyParser = require('body-parser');
const recast = require('./lib/RecastCLI.node');

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

app.post('/_/build/', (req, res) => {

  if (!req.body) return res.sendStatus(400);

  const config =[
    req.query.cellSize,
    req.query.cellHeight,
    req.query.agentHeight,
    req.query.agentRadius,
    req.query.agentMaxClimb,
    req.query.agentMaxSlope
  ]
    .map(Number)
    .filter(Number.isFinite);


  console.log(config, req.params);

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





