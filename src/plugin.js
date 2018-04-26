/* global THREE, AFRAME */

const panelTpl = require('./plugin.html');
const OBJExporter = require('../lib/OBJExporter');

require('./plugin.scss');

const DEFAULT_SETTINGS = {
  cellSize: 0.03,
  cellHeight: 0.02,
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
      const label = this.panelEl.querySelector(`[data-bind=${key}]`);
      label.textContent = input.value = settings[key];
      input.addEventListener('input', () => {
        settings[key] = label.textContent = Number(input.value);
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
    const content = new THREE.Scene();
    this.sceneEl.object3D.updateMatrixWorld();
    this.sceneEl.object3D.traverse((node) => {
      if (!node.isMesh || node.name.match(/^[XYZE]+|picker$/)) return;
      const clone = node.clone();
      clone.matrix.copy(node.matrixWorld);
      content.add(clone);
    });

    console.info('Pruned scene graph:');
    this.printGraph(content);

    const exporter = new OBJExporter();
    const loader = new THREE.OBJLoader();
    const body = exporter.parse(content);
    const params = this.serialize(this.settings);

    this.pending = true;
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
        this.sceneEl.object3D.add(this.navMesh);
      })
      .catch((e) => console.error(e))
      .then(() => (this.pending = false));

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

