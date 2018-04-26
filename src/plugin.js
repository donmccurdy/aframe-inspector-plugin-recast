/* global recast, THREE */

const panelTpl = require('./plugin.html');
const GLTFExporter = require('../lib/GLTFExporter');
const OBJExporter = require('../lib/OBJExporter');

require('./plugin.scss');

let objContentTMP;
fetch('./assets/tmp-pruned.obj')
  .then((response) => response.text())
  .then((text) => (objContentTMP = text));

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
  constructor (panelEl, sceneEl) {
    this.panelEl = panelEl;
    this.sceneEl = sceneEl;
    this.settings = Object.assign({}, DEFAULT_SETTINGS);
    this.navMesh = null;
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

    // Rebuild on click.
    const btnEl = this.panelEl.querySelector('[name=build]');
    btnEl.addEventListener('click', () => this.rebuild());
  }

  /**
   * Convert the current scene to an OBJ, rebuild the navigation mesh, and show
   * a preview of the navigation mesh in the scene.
   */
  rebuild () {
    const content = this.sceneEl.object3D.clone();
    const pruned = [];
    content.traverse((node) => {
      if (node.isCamera || node.isLight) pruned.push(node);
    });
    pruned.forEach((node) => node.parent.remove(node));

    console.info('Pruned scene graph:');
    this.printGraph(content);

    const exporter = new OBJExporter();
    const loader = new THREE.OBJLoader();
    const body = exporter.parse(content);
    const params = this.serialize(this.settings);

    this.pending = true;
    fetch(`http://localhost:3000/_/build/?${params}`, {method: 'post', body: body})
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
    const exporter = new GLTFExporter();
    exporter.parse(this.navMesh, (gltfContent) => {
      this._download('navmesh.gltf', JSON.stringify(gltfContent));
    });
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
}

// Bootstrap.
document.addEventListener('DOMContentLoaded', () => {
  const tmpEl = document.createElement('div');
  tmpEl.innerHTML = panelTpl;
  const panelEl = tmpEl.children[0];
  document.body.appendChild(panelEl);
  const sceneEl = document.querySelector('a-scene');
  window.recastPlugin = new RecastPlugin(panelEl, sceneEl);
});
