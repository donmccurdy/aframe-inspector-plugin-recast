(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @author mrdoob / http://mrdoob.com/
 */

var OBJExporter = function () {};

OBJExporter.prototype = {

  constructor: OBJExporter,

  parse: function ( object, options ) {

    options = Object.assign({}, {
      includeNormals: true,
      includeUVs: true
    }, options);

    var output = '';

    var indexVertex = 0;
    var indexVertexUvs = 0;
    var indexNormals = 0;

    var vertex = new THREE.Vector3();
    var normal = new THREE.Vector3();
    var uv = new THREE.Vector2();

    var i, j, k, l, m, face = [];

    var parseMesh = function ( mesh ) {

      var nbVertex = 0;
      var nbNormals = 0;
      var nbVertexUvs = 0;

      var geometry = mesh.geometry;

      var normalMatrixWorld = new THREE.Matrix3();

      if ( geometry instanceof THREE.Geometry ) {

        geometry = new THREE.BufferGeometry().setFromObject( mesh );

      }

      if ( geometry instanceof THREE.BufferGeometry ) {

        // shortcuts
        var vertices = geometry.getAttribute( 'position' );
        var normals = geometry.getAttribute( 'normal' );
        var uvs = geometry.getAttribute( 'uv' );
        var indices = geometry.getIndex();

        // name of the mesh object
        output += 'o ' + mesh.name + '\n';

        // name of the mesh material
        if ( mesh.material && mesh.material.name ) {

          output += 'usemtl ' + mesh.material.name + '\n';

        }

        // vertices

        if ( vertices !== undefined ) {

          for ( i = 0, l = vertices.count; i < l; i ++, nbVertex ++ ) {

            vertex.x = vertices.getX( i );
            vertex.y = vertices.getY( i );
            vertex.z = vertices.getZ( i );

            // transfrom the vertex to world space
            vertex.applyMatrix4( mesh.matrixWorld );

            // transform the vertex to export format
            output += 'v ' + vertex.x + ' ' + vertex.y + ' ' + vertex.z + '\n';

          }

        }

        // uvs

        if ( uvs !== undefined ) {

          for ( i = 0, l = uvs.count; i < l; i ++, nbVertexUvs ++ ) {

            uv.x = uvs.getX( i );
            uv.y = uvs.getY( i );

            // transform the uv to export format
            output += 'vt ' + uv.x + ' ' + uv.y + '\n';

          }

        }

        // normals

        if ( normals !== undefined ) {

          normalMatrixWorld.getNormalMatrix( mesh.matrixWorld );

          for ( i = 0, l = normals.count; i < l; i ++, nbNormals ++ ) {

            normal.x = normals.getX( i );
            normal.y = normals.getY( i );
            normal.z = normals.getZ( i );

            // transfrom the normal to world space
            normal.applyMatrix3( normalMatrixWorld );

            // transform the normal to export format
            output += 'vn ' + normal.x + ' ' + normal.y + ' ' + normal.z + '\n';

          }

        }

        // faces

        if ( indices !== null ) {

          for ( i = 0, l = indices.count; i < l; i += 3 ) {

            for ( m = 0; m < 3; m ++ ) {

              j = indices.getX( i + m ) + 1;

              face[ m ] = ( indexVertex + j ) + '/' + ( uvs ? ( indexVertexUvs + j ) : '' ) + '/' + ( indexNormals + j );

            }

            // transform the face to export format
            output += 'f ' + face.join( ' ' ) + "\n";

          }

        } else {

          for ( i = 0, l = vertices.count; i < l; i += 3 ) {

            for ( m = 0; m < 3; m ++ ) {

              j = i + m + 1;

              face[ m ] = ( indexVertex + j ) + '/' + ( uvs ? ( indexVertexUvs + j ) : '' ) + '/' + ( indexNormals + j );

            }

            // transform the face to export format
            output += 'f ' + face.join( ' ' ) + "\n";

          }

        }

      } else {

        console.warn( 'THREE.OBJExporter.parseMesh(): geometry type unsupported', geometry );

      }

      // update index
      indexVertex += nbVertex;
      indexVertexUvs += nbVertexUvs;
      indexNormals += nbNormals;

    };

    var parseLine = function ( line ) {

      var nbVertex = 0;

      var geometry = line.geometry;
      var type = line.type;

      if ( geometry instanceof THREE.Geometry ) {

        geometry = new THREE.BufferGeometry().setFromObject( line );

      }

      if ( geometry instanceof THREE.BufferGeometry ) {

        // shortcuts
        var vertices = geometry.getAttribute( 'position' );

        // name of the line object
        output += 'o ' + line.name + '\n';

        if ( vertices !== undefined ) {

          for ( i = 0, l = vertices.count; i < l; i ++, nbVertex ++ ) {

            vertex.x = vertices.getX( i );
            vertex.y = vertices.getY( i );
            vertex.z = vertices.getZ( i );

            // transfrom the vertex to world space
            vertex.applyMatrix4( line.matrixWorld );

            // transform the vertex to export format
            output += 'v ' + vertex.x + ' ' + vertex.y + ' ' + vertex.z + '\n';

          }

        }

        if ( type === 'Line' ) {

          output += 'l ';

          for ( j = 1, l = vertices.count; j <= l; j ++ ) {

            output += ( indexVertex + j ) + ' ';

          }

          output += '\n';

        }

        if ( type === 'LineSegments' ) {

          for ( j = 1, k = j + 1, l = vertices.count; j < l; j += 2, k = j + 1 ) {

            output += 'l ' + ( indexVertex + j ) + ' ' + ( indexVertex + k ) + '\n';

          }

        }

      } else {

        console.warn( 'THREE.OBJExporter.parseLine(): geometry type unsupported', geometry );

      }

      // update index
      indexVertex += nbVertex;

    };

    object.traverse( function ( child ) {

      if ( child instanceof THREE.Mesh ) {

        parseMesh( child );

      }

      if ( child instanceof THREE.Line ) {

        parseLine( child );

      }

    } );

    return output;

  }

};

module.exports = OBJExporter;

},{}],2:[function(require,module,exports){
'use strict'
/*eslint-env browser */

module.exports = {
  /**
   * Create a <style>...</style> tag and add it to the document head
   * @param {string} cssText
   * @param {object?} options
   * @return {Element}
   */
  createStyle: function (cssText, options) {
    var container = document.head || document.getElementsByTagName('head')[0]
    var style = document.createElement('style')
    options = options || {}
    style.type = 'text/css'
    if (options.href) {
      style.setAttribute('data-href', options.href)
    }
    if (style.sheet) { // for jsdom and IE9+
      style.innerHTML = cssText
      style.sheet.cssText = cssText
    }
    else if (style.styleSheet) { // for IE8 and below
      style.styleSheet.cssText = cssText
    }
    else { // for Chrome, Firefox, and Safari
      style.appendChild(document.createTextNode(cssText))
    }
    if (options.prepend) {
      container.insertBefore(style, container.childNodes[0]);
    } else {
      container.appendChild(style);
    }
    return style
  }
}

},{}],3:[function(require,module,exports){
module.exports = "<section class=\"recast-plugin-panel\">\n  <header class=\"panel-header\">Plugin: NavMesh Builder</header>\n  <div class=\"panel-content\">\n    <label class=\"panel-field\">\n      <span class=\"panel-field-label\">\n        cellSize:\n        <span data-bind=\"cellSize\"></span>\n      </span>\n      <input type=\"number\" min=\"0.1\" max=\"3\" step=\"0.01\" name=\"cellSize\" value=\"\">\n    </label>\n    <label class=\"panel-field\">\n      <span class=\"panel-field-label\">\n        cellHeight:\n      </span>\n      <input type=\"number\" min=\"0.1\" max=\"3\" step=\"0.01\" name=\"cellHeight\" value=\"\">\n    </label>\n    <label class=\"panel-field\">\n      <span class=\"panel-field-label\">\n        agentHeight:\n      </span>\n      <input type=\"number\" min=\"0.1\" max=\"3\" step=\"0.01\" name=\"agentHeight\" value=\"\">\n    </label>\n    <label class=\"panel-field\">\n      <span class=\"panel-field-label\">\n        agentRadius:\n      </span>\n      <input type=\"number\" min=\"0.1\" max=\"3\" step=\"0.01\" name=\"agentRadius\" value=\"\">\n    </label>\n    <label class=\"panel-field\">\n      <span class=\"panel-field-label\">\n        agentMaxClimb:\n      </span>\n      <input type=\"number\" min=\"0.1\" max=\"5\" step=\"0.01\" name=\"agentMaxClimb\" value=\"\">\n    </label>\n    <label class=\"panel-field\">\n      <span class=\"panel-field-label\">\n        agentMaxSlope:\n      </span>\n      <input type=\"number\" min=\"0\" max=\"90\" name=\"agentMaxSlope\" value=\"\">\n    </label>\n    <label class=\"panel-field\">\n      <span class=\"panel-field-label\">\n        selector:\n      </span>\n      <input type=\"text\" name=\"selector\" value=\"\" placeholder=\"*\">\n    </label>\n  </div>\n  <div class=\"panel-btn-wrap\">\n    <button name=\"build\" class=\"panel-btn\">Build</button>\n    <button name=\"export\" class=\"panel-btn\">Export</button>\n  </div>\n  <div class=\"recast-spinner\">\n    <!-- http://tobiasahlin.com/spinkit/ -->\n    <div class=\"sk-folding-cube\">\n      <div class=\"sk-cube1 sk-cube\"></div>\n      <div class=\"sk-cube2 sk-cube\"></div>\n      <div class=\"sk-cube4 sk-cube\"></div>\n      <div class=\"sk-cube3 sk-cube\"></div>\n    </div>\n  </div>\n</section>\n";

},{}],4:[function(require,module,exports){
/* global THREE, AFRAME */

const panelTpl = require('./plugin.html');
const OBJExporter = require('../lib/OBJExporter');

require('./plugin.scss');

const DEFAULT_SETTINGS = {
  cellSize: 0.3,
  cellHeight: 0.2,
  agentHeight: 0.8,
  agentRadius: 0.2,
  agentMaxClimb: 0.5,
  agentMaxSlope: 30,
};

/**
 * Recast navigation mesh plugin.
 */
class RecastPlugin {
  constructor (panelEl, sceneEl, host) {
    this.panelEl = panelEl;
    this.sceneEl = sceneEl;
    this.spinnerEl = panelEl.querySelector('.recast-spinner');
    this.settings = Object.assign({}, DEFAULT_SETTINGS);
    this.navMesh = null;
    this.host = host;
    this.bindListeners();
  }

  /** Attach event listeners to the panel DOM. */
  bindListeners () {
    const settings = this.settings;

    // Update labels when sliders change.
    Object.keys(settings).forEach((key) => {
      const input = this.panelEl.querySelector(`input[name=${key}]`);
      input.value = settings[key];
      input.addEventListener('input', () => {
        settings[key] = Number(input.value);
      });
    });

    // Rebuild.
    const rebuildBtnEl = this.panelEl.querySelector('[name=build]');
    rebuildBtnEl.addEventListener('click', () => this.rebuild());

    // Export.
    const exportBtnEl = this.panelEl.querySelector('[name=export]');
    exportBtnEl.addEventListener('click', () => this.exportGLTF());
  }

  /**
   * Convert the current scene to an OBJ, rebuild the navigation mesh, and show
   * a preview of the navigation mesh in the scene.
   */
  rebuild () {
    this.clearNavMesh();
    const content = this.gatherScene();

    console.info('Pruned scene graph:');
    this.printGraph(content);

    const exporter = new OBJExporter();
    const loader = new THREE.OBJLoader();
    const body = exporter.parse(content);
    const params = this.serialize(this.settings);

    this.showSpinner();
    fetch(`${this.host}/v1/build/?${params}`, {method: 'post', body: body})
      .then((response) => response.json())
      .then((json) => {
        if (!json.ok) throw new Error('Something went wrong');

        const navMeshGroup = loader.parse(json.obj);
        const meshes = [];

        navMeshGroup.traverse((node) => {
          if (node.isMesh) meshes.push(node);
        });

        if (meshes.length !== 1) {
          console.warn('[aframe-inspector-plugin-recast] Expected 1 navmesh but got ' + meshes.length);
          if (meshes.length === 0) return;
        }

        if (this.navMesh) this.sceneEl.object3D.remove(this.navMesh);

        this.navMesh = meshes[0];
        this.navMesh.material = new THREE.MeshBasicMaterial({color: Math.random() * 0xffffff});
        this.injectNavMesh(this.navMesh);
      })
      .catch((e) => {
        console.error(e);
        alert('Oops, something went wrong.');
      })
      .then(() => this.hideSpinner());

  }

  /** Collect all (or selected) objects from scene. */
  gatherScene () {
    const selectorInput = this.panelEl.querySelector(`input[name=selector]`);
    const selector = selectorInput.value;

    const content = new THREE.Scene();
    this.sceneEl.object3D.updateMatrixWorld();

    if ( selector ) {

      const selected = this.sceneEl.querySelectorAll(selector);
      const visited = new Set();

      [].forEach.call(selected, (el) => {
        if (!el.object3D) return;
        el.object3D.traverse((node) => {
          if (visited.has(node)) return;
          collect(node);
          visited.add(node);
        });
      });

    } else {

      this.sceneEl.object3D.traverse(collect);

    }

    function collect (node) {
      if (!node.isMesh || node.name.match(/^[XYZE]+|picker$/)) return;
      const clone = node.clone();
      clone.matrix.copy(node.matrixWorld);
      content.add(clone);
    }

    return content;

  }

  injectNavMesh (navMesh) {
    let navMeshEl = this.sceneEl.querySelector('[nav-mesh]');
    if (!navMeshEl) {
      navMeshEl = document.createElement('a-entity');
      navMeshEl.setAttribute('nav-mesh', '');
      this.sceneEl.appendChild(navMeshEl);
    }
    setTimeout(() => {
      navMeshEl.setObject3D('mesh', navMesh);
      navMeshEl.components['nav-mesh'].loadNavMesh();
    }, 20);
  }

  clearNavMesh () {
    const navMeshEl = this.sceneEl.querySelector('[nav-mesh]');
    if (navMeshEl) navMeshEl.removeObject3D('mesh');
  }

  /** Export to glTF 2.0. */
  exportGLTF () {
    if (!this.navMesh) throw new Error('[RecastPlugin] No navigation mesh.');
    const exporter = new THREE.GLTFExporter();
    exporter.parse(this.navMesh, (gltfContent) => {
      this._download('navmesh.gltf', JSON.stringify(gltfContent));
    }, {binary: false});
  }

  /** Export to OBJ. */
  exportOBJ () {
    if (!this.navMesh) throw new Error('[RecastPlugin] No navigation mesh.');
    const exporter = new OBJExporter();
    this._download('navmesh.obj', exporter.parse(this.navMesh));
  }

  /**
   * Start a nav mesh download from the user's browser.
   * @param  {string} filename
   * @param  {string} content
   */
  _download (filename, content) {
    const el = document.createElement('a');
    el.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    el.setAttribute('download', filename);
    el.style.display = 'none';

    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
  }

  printGraph (node) {

    console.group(' <' + node.type + '> ' + node.name);
    node.children.forEach((child) => this.printGraph(child));
    console.groupEnd();

  }

  serialize (obj) {
    const str = [];
    for (let p in obj) {
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
      }
    }
    return str.join('&');
  }

  setVisible (visible) {
    this.panelEl.style.display = visible ? '' : 'none';
  }

  showSpinner () {
    this.spinnerEl.classList.add('active');
  }

  hideSpinner () {
    this.spinnerEl.classList.remove('active');
  }
}

AFRAME.registerComponent('inspector-plugin-recast', {
  schema: {
    serviceURL: {default: 'https://recast-api.donmccurdy.com'},
  },
  init: function () {
    const tmpEl = document.createElement('div');
    tmpEl.innerHTML = panelTpl;
    const panelEl = tmpEl.children[0];
    document.body.appendChild(panelEl);
    this.plugin = new RecastPlugin(panelEl, this.el, this.data.serviceURL);
  },
  pause: function () {
    this.plugin.setVisible(true);
  },
  play: function () {
    this.plugin.setVisible(false);
  }
});


},{"../lib/OBJExporter":1,"./plugin.html":3,"./plugin.scss":5}],5:[function(require,module,exports){
var css = ".recast-plugin-panel{position:absolute;z-index:99998;bottom:0;left:230px;right:331px;height:200px;background:#2b2b2b;color:#868686;box-sizing:border-box;border-left:1px solid #222;border-right:1px solid #222}.recast-plugin-panel .panel-header{background:#222;text-transform:uppercase;padding:0.5em}.recast-plugin-panel .panel-content{display:grid;grid-template-columns:1fr 1fr 1fr;grid-column-gap:1em;padding:1em;max-width:500px}.recast-plugin-panel .panel-field{display:flex;flex-direction:column;padding-bottom:1em}.recast-plugin-panel .panel-field-label{padding-bottom:0.2em}.recast-plugin-panel .panel-btn-wrap{position:absolute;bottom:1em;right:1em}.recast-plugin-panel .recast-spinner{z-index:1000;width:100%;height:100%;background:rgba(0,0,0,0.5);position:absolute;left:0;top:0;display:flex;align-items:center;opacity:0.0;pointer-events:none;transition:opacity ease 0.2s}.recast-plugin-panel .recast-spinner .sk-folding-cube{margin:20px auto;width:40px;height:40px;position:relative;-webkit-transform:rotateZ(45deg);transform:rotateZ(45deg)}.recast-plugin-panel .recast-spinner .sk-folding-cube .sk-cube{float:left;width:50%;height:50%;position:relative;-webkit-transform:scale(1.1);-ms-transform:scale(1.1);transform:scale(1.1)}.recast-plugin-panel .recast-spinner .sk-folding-cube .sk-cube:before{content:'';position:absolute;top:0;left:0;width:100%;height:100%;background-color:#ed3160;-webkit-animation:sk-foldCubeAngle 2.4s infinite linear both;animation:sk-foldCubeAngle 2.4s infinite linear both;-webkit-transform-origin:100% 100%;-ms-transform-origin:100% 100%;transform-origin:100% 100%}.recast-plugin-panel .recast-spinner .sk-folding-cube .sk-cube2{-webkit-transform:scale(1.1) rotateZ(90deg);transform:scale(1.1) rotateZ(90deg)}.recast-plugin-panel .recast-spinner .sk-folding-cube .sk-cube3{-webkit-transform:scale(1.1) rotateZ(180deg);transform:scale(1.1) rotateZ(180deg)}.recast-plugin-panel .recast-spinner .sk-folding-cube .sk-cube4{-webkit-transform:scale(1.1) rotateZ(270deg);transform:scale(1.1) rotateZ(270deg)}.recast-plugin-panel .recast-spinner .sk-folding-cube .sk-cube2:before{-webkit-animation-delay:0.3s;animation-delay:0.3s}.recast-plugin-panel .recast-spinner .sk-folding-cube .sk-cube3:before{-webkit-animation-delay:0.6s;animation-delay:0.6s}.recast-plugin-panel .recast-spinner .sk-folding-cube .sk-cube4:before{-webkit-animation-delay:0.9s;animation-delay:0.9s}@-webkit-keyframes sk-foldCubeAngle{0%,10%{-webkit-transform:perspective(140px) rotateX(-180deg);transform:perspective(140px) rotateX(-180deg);opacity:0}25%,75%{-webkit-transform:perspective(140px) rotateX(0deg);transform:perspective(140px) rotateX(0deg);opacity:1}90%,100%{-webkit-transform:perspective(140px) rotateY(180deg);transform:perspective(140px) rotateY(180deg);opacity:0}}@keyframes sk-foldCubeAngle{0%,10%{-webkit-transform:perspective(140px) rotateX(-180deg);transform:perspective(140px) rotateX(-180deg);opacity:0}25%,75%{-webkit-transform:perspective(140px) rotateX(0deg);transform:perspective(140px) rotateX(0deg);opacity:1}90%,100%{-webkit-transform:perspective(140px) rotateY(180deg);transform:perspective(140px) rotateY(180deg);opacity:0}}.recast-plugin-panel .recast-spinner.active{opacity:1.0;pointer-events:all}\n"
module.exports = require('scssify').createStyle(css, {})
},{"scssify":2}]},{},[4]);
