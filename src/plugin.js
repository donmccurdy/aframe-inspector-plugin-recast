/* global THREE, AFRAME */

const Handlebars = require('handlebars');
const RecastConfig = require('./recast-config');
const panelTpl = require('./plugin.html');
const OBJExporter = require('../lib/OBJExporter');

require('./plugin.scss');

const MAX_EXTENT = 500;
const MAX_FILESIZE = 25000000;

class RecastError extends Error {}

/**
 * Recast navigation mesh plugin.
 */
class RecastPlugin {
  constructor (panelEl, sceneEl, host) {
    this.panelEl = panelEl;
    this.sceneEl = sceneEl;
    this.spinnerEl = panelEl.querySelector('.recast-spinner');
    this.settings = {};
    this.navMesh = null;
    this.host = host;
    this.bindListeners();
  }

  /** Attach event listeners to the panel DOM. */
  bindListeners () {
    const settings = this.settings;

    // Update labels when sliders change.
    RecastConfig.forEach(({name}) => {
      const input = this.panelEl.querySelector(`input[name=${name}]`);
      settings[name] = input.value;
      input.addEventListener('input', () => {
        settings[name] = Number(input.value);
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
    this.validateForm();

    this.clearNavMesh();
    const content = this.gatherScene();

    console.info('Pruned scene graph:');
    this.printGraph(content);

    const exporter = new OBJExporter();
    const loader = new THREE.OBJLoader();
    const body = exporter.parse(content, {includeNormals: false, includeUVs: false});
    const params = this.serialize(this.settings);

    if (body.length > MAX_FILESIZE) {
      const errorMsg = `Upload size cannot exceed ${MAX_FILESIZE / 1e6}mb. `
        + `Please filter objects or create the navmesh locally.`;
      window.alert(errorMsg);
      throw new Error(errorMsg);
    }

    this.showSpinner();
    fetch(`${this.host}/v1/build/?${params}`, {method: 'post', body: body})
      .then((response) => response.json())
      .then((json) => {
        if (!json.ok) throw new RecastError(json.message);

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
        this.navMesh.material = new THREE.MeshNormalMaterial();
        this.injectNavMesh(this.navMesh);
      })
      .catch((e) => {
        console.error(e);
        e instanceof RecastError
          ? window.alert(e.message)
          : window.alert('Oops, something went wrong.');
      })
      .then(() => this.hideSpinner());

  }

  /** Validate all form inputs. */
  validateForm () {
    const form = this.panelEl.querySelector('.panel-content');
    if (!form.checkValidity()) {
      const errorMsg = 'Please correct errors navmesh configuration.';
      window.alert(errorMsg);
      throw new Error(errorMsg);
    }
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
      // Filter out non-meshes and Inspector elements.
      if (!node.isMesh || node.name.match(/^[XYZE]+|picker$/)) return;
      const clone = node.clone();
      node.matrixWorld.decompose(clone.position, clone.quaternion, clone.scale);
      content.add(clone);
    }

    const boundingSphere = new THREE.Box3()
      .setFromObject( content )
      .getBoundingSphere();

    if ( boundingSphere.radius > MAX_EXTENT ) {

      const errorMsg = `Scene must have a bounding radius less than ${MAX_EXTENT}m. `
        + `Reduce size, filter large objects out, or run the plugin locally.`;
      window.alert(errorMsg);
      throw new Error(errorMsg);

    }

    return content;

  }

  /**
   * Injects navigation mesh into the scene, creating entity if needed.
   * @param  {THREE.Mesh} navMesh
   */
  injectNavMesh (navMesh) {
    let navMeshEl = this.sceneEl.querySelector('[nav-mesh]');
    if (!navMeshEl) {
      navMeshEl = document.createElement('a-entity');
      navMeshEl.setAttribute('nav-mesh', '');
      navMeshEl.setAttribute('id', 'nav-mesh');
      this.sceneEl.appendChild(navMeshEl);
    }
    setTimeout(() => {
      navMeshEl.setObject3D('mesh', navMesh);
      navMeshEl.components['nav-mesh'].loadNavMesh();
    }, 20);
  }

  /** Removes navigation mesh, if any, from scene. */
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

  /**
   * Prints debug graph of a scene subtree.
   * @param  {THREE.Object3D} node
   */
  printGraph (node) {

    console.group(' <' + node.type + '> ' + node.name);
    node.children.forEach((child) => this.printGraph(child));
    console.groupEnd();

  }

  /**
   * Converts an object to URI query parameters.
   * @param  {Object<string, *>} obj
   * @return {string}
   */
  serialize (obj) {
    const str = [];
    for (let p in obj) {
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
      }
    }
    return str.join('&');
  }

  /**
   * Sets visibility of the plugin panel.
   * @param {boolean} visible
   */
  setVisible (visible) {
    this.panelEl.style.display = visible ? '' : 'none';
  }

  /** Shows the loading spinner. */
  showSpinner () {
    this.spinnerEl.classList.add('active');
  }

  /** Hides the loading spinner. */
  hideSpinner () {
    this.spinnerEl.classList.remove('active');
  }
}

/**
 * Plugin component wrapper.
 *
 * The A-Frame Inspector does not technically have a plugin
 * API, and so we use this component to detect events (play/pause) indicating
 * that the inspector is (probably) opened or closed.
 */
AFRAME.registerComponent('inspector-plugin-recast', {
  schema: {
    serviceURL: {default: 'https://recast-api.donmccurdy.com'},
  },
  init: function () {
    const wrapEl = document.createElement('div');
    const template = Handlebars.compile(panelTpl);
    wrapEl.innerHTML = template({RecastConfig: RecastConfig});
    const panelEl = wrapEl.children[0];
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

