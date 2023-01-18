const express = require('express');
const multer = require('multer');
const assert = require('fluent-assert');
const Recast = require('recast-detour');
const RecastConfig = require('./src/recast-config');

const PORT = process.env.PORT || 3000;

// ---------------------------------------- //

const app = express();

const upload = multer({ storage: multer.memoryStorage(), limits: {fileSize: '50mb'} })
  .fields([{ name: 'position', maxCount: 1 }, { name: 'index', maxCount: 1 }]);

// ---------------------------------------- //

let recast;

async function init() {
  recast = await Recast();
}

// ---------------------------------------- //

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// ---------------------------------------- //

app.post('*', upload, async (req, res) => {

  await init();

  const files = req.files || {};
  if (!files.position || !files.index) return res.sendStatus(400);

  const config = new recast.rcConfig();

  // Validate configuration.
  try {

    // Reference:
    // - https://github.com/BabylonJS/Babylon.js/blob/eba84f474c7e1bc1d331e76c0e13a8ccbc772a34/packages/dev/core/src/Navigation/Plugins/recastJSPlugin.ts

    config.borderSize = 0;
    config.tileSize = 0;

    RecastConfig.forEach((param) => {
      assert.ok(param.name, req.query[param.name]);
      const value = Number(req.query[param.name]);
      assert.number(param.name, value).range(param.min, param.max);
      config[param.recastName] = value;
    });

    console.log(config);

  } catch (e) {

    console.error(e);
    res.send({ok: false, message: e.message});
    return;

  }

  let navmesh;

  // Load input.
  try {

    // Buffer references. Buffer.prototype.buffer is an ArrayBuffer.
    const positionBuffer = files.position[0].buffer;
    const indexBuffer = files.index[0].buffer;

    const position = new Float32Array(
      positionBuffer.buffer,
      positionBuffer.byteOffset,
      positionBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT
    );
    const index = new Uint32Array(
      indexBuffer.buffer,
      indexBuffer.byteOffset,
      indexBuffer.byteLength / Uint32Array.BYTES_PER_ELEMENT
    );

    console.log(`${position.length / 3} vertices, ${index.length / 3} faces.`);

    if (!position.length || !index.length) {
      throw new Error('No mesh data.');
    }

    console.time('recast::load');
    navmesh = new recast.NavMesh();
    navmesh.build(
      Array.from(position),
      position.length / 3,
      Array.from(index),
      index.length,
      config
    );
    console.timeEnd('recast::load');

  } catch (e) {

    console.error(e);
    res.send({ok: false, message: 'Invalid mesh.'});
    return;

  }

  // Construct navmesh.
  try {

    console.time('recast::build');
    const debug = navmesh.getDebugNavMesh();
    const triangles = debug.getTriangleCount();
    console.log({triangles, debug});
    // TODO: extract navmesh data
    console.timeEnd('recast::build');

    if (output.indexOf('v') === -1) {
      throw new Error('Empty navmesh.');
    }

    console.time('recast::send');
    res.send({ok: true, obj: output});
    console.timeEnd('recast::send');

  } catch (e) {

    console.error(e);
    res.send({ok: false, message: 'Failed to build navigation mesh.'});

  }

});

// ---------------------------------------- //

module.exports = app;

// ---------------------------------------- //





