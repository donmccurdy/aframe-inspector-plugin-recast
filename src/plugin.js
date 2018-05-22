/* global THREE, AFRAME */

const Handlebars = require('handlebars');
const RecastConfig = require('./recast-config');
const panelTpl = require('./plugin.html');
const OBJExporter = require('../lib/OBJExporter');
const BufferGeometryUtils = require('../lib/BufferGeometryUtils');

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

    const loader = new THREE.OBJLoader();
    const body = this.serializeScene(content);
    const params = this.serialize(this.settings);

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
      this.fail('Please correct errors navmesh configuration.');
    }
  }

  /** Collect all (or selected) objects from scene. */
  gatherScene () {
    const selectorInput = this.panelEl.querySelector(`input[name=selector]`);
    const selector = selectorInput.value;

    const content = new THREE.Scene();
    this.sceneEl.object3D.updateMatrixWorld();

    this.markInspectorNodes();

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
      if (node.userData._isInspectorNode) return;
      if (!node.isMesh || node.name.match(/^[XYZE]+|picker$/)) return;
      const clone = node.clone();
      node.matrixWorld.decompose(clone.position, clone.quaternion, clone.scale);
      content.add(clone);
    }

    const boundingSphere = new THREE.Box3()
      .setFromObject( content )
      .getBoundingSphere();

    if ( boundingSphere.radius > MAX_EXTENT ) {

      this.fail(
        `Scene must have a bounding radius less than ${MAX_EXTENT}m. `
        + `Reduce size, filter large objects out, or run the plugin locally.`
      );

    }

    return content;

  }

  /**
   * @param {Object3D} scene
   * @return {FormData}
   */
  serializeScene (scene) {
    const geometries = [];

    // Traverse the scene and collect mesh geometry.
    scene.traverse((node) => {
      if (!node.isMesh) return;

      let geometry = node.geometry;
      let attributes = geometry.attributes;

      // Convert everything to BufferGeometry.
      if (!geometry.isBufferGeometry) {
        geometry = new THREE.BufferGeometry().fromGeometry(geometry);
        attributes = geometry.attributes;
      }

      // Skip geometry without 3D position data, like text.
      if (!attributes.position || attributes.position.itemSize !== 3) return;

      // Convert everything to triangle-soup for simplicity.
      if (geometry.index) geometry = geometry.toNonIndexed();

      // Create a position-only version of the geometry, because geometry with
      // different attributes can't be merged.  Apply transforms to geometry.
      const cloneGeometry = new THREE.BufferGeometry();
      cloneGeometry.addAttribute('position', geometry.attributes.position.clone());
      cloneGeometry.applyMatrix(node.matrixWorld);
      geometry = cloneGeometry;

      geometries.push(geometry);
    });

    // Merge geometries.
    const geometry = BufferGeometryUtils.mergeBufferGeometries(geometries);

    if (!geometry) this.fail('No mesh data found.');

    // Create index.
    const position = geometry.attributes.position.array;
    const index = new Uint32Array( position.length / 3 );
    for (let i = 0; i < index.length; i++) index[i] = i + 1;

    // Compute and validate scene size.
    const bodyLength = position.length * Float32Array.BYTES_PER_ELEMENT
      + index.length * Int32Array.BYTES_PER_ELEMENT;
    if (bodyLength === 0) this.fail('No mesh data found.');
    if (bodyLength > MAX_FILESIZE) {
      this.fail(
        `Upload size cannot exceed ${MAX_FILESIZE / 1e6}mb, found ${bodyLength}mb. `
        + `Please filter objects or create the navmesh locally.`
      );
    }

    // Convert vertices and index to Blobs, add to FormData, and return.
    const positionBlob = new Blob([new Float32Array(position)], {type: 'application/octet-stream'});
    const indexBlob = new Blob([new Int32Array(index)], {type: 'application/octet-stream'});
    const formData = new FormData();
    formData.append('position', positionBlob);
    formData.append('index', indexBlob);
    return formData;
  }

  /**
   * Attempt to pre-mark inspector-injected nodes. Unfortunately
   * there is no reliable way to do this; we have to assume the first
   * object named 'picker' is one of them, walk up the tree, and mark
   * everything below its root.
   */
  markInspectorNodes () {
    const scene = this.sceneEl.object3D;
    let inspectorNode = scene.getObjectByName('picker');
    while (inspectorNode.parent !== scene) inspectorNode = inspectorNode.parent;
    inspectorNode.traverse((node) => {
      node.userData._isInspectorNode = true;
    });
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
      const navMeshComponent = navMeshEl.components['nav-mesh'];
      if (navMeshComponent) navMeshComponent.loadNavMesh();
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
    const backupMaterial = this.navMesh.material;
    this.navMesh.material = new THREE.MeshStandardMaterial({color: 0x808080, metalness: 0, roughness: 1});
    exporter.parse(this.navMesh, (gltfContent) => {
      this.navMesh.material = backupMaterial;
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

  /**
   * Displays a user-facing message then throws an error.
   * @param {string} msg
   */
  fail (msg) {
    window.alert(msg);
    throw new Error(msg);
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

