const BufferGeometryUtils = require('../lib/BufferGeometryUtils');

const DEFAULT_OPTIONS = {
  maxExtent: 500,
  maxFileSize: 25000000,
  ignore: '',
};

/**
 * Reduces a given set of 3D objects into a single geometry, represented
 * by a position and index array pair. Position data is preserved, other
 * attributes (original indices, normals, colors, etc.) are ignored.
 */
class GeometryReducer {

  constructor ( options ) {

    this.options = Object.assign({}, options || {}, DEFAULT_OPTIONS);

    this.content = new THREE.Group();

  }


  /**
   * Adds an object to the build list, ignoring its descendants.
   * Objects that do not pass test criteria are ignored.
   *
   * @param  {THREE.Object3D} object
   */
  add (node) {

    const {ignore} = this.options;

    // Filter out non-meshes and Inspector elements.
    if (node.userData._isInspectorNode) return;
    if (!node.isMesh || ignore && node.name.match(ignore)) return;

    const clone = node.clone();
    node.matrixWorld.decompose(clone.position, clone.quaternion, clone.scale);
    this.content.add(clone);

    return this;

  }

  /**
   * Builds a single pair of position and index arrays from the
   * build list.
   *
   * @return {{position: Float32Array, index: Uint32Array}}
   */
  reduce () {

    const { maxExtent, maxFileSize } = this.options;

    const boundingSphere = new THREE.Box3()
      .setFromObject( this.content )
      .getBoundingSphere(new THREE.Sphere());

    if ( boundingSphere.radius > maxExtent ) {

      throw new Error(
        `Scene must have a bounding radius less than ${maxExtent}m. `
        + `Reduce size, filter large objects out, or run the plugin locally.`
      );

    }

    const geometries = [];

    // Traverse the scene and collect mesh geometry.
    this.content.traverse((node) => {
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
    if (bodyLength > maxFileSize) {
      throw new Error(
        `Upload size cannot exceed ${maxFileSize / 1e6}mb, found ${bodyLength}mb. `
        + `Please filter objects or create the navmesh locally.`
      );
    }

    return { position, index };

  }

  reduceGLTF () {

    const { position, index } = this.reduce();

    const geometry = new THREE.BufferGeometry();
    geometry.addAttribute( 'position', new THREE.BufferAttribute( position, 3 ) );
    // index isn't necessary, positions are triangle soup anyway.
    // geometry.setIndex( new THREE.BufferAttribute( index, 1 ) );
    const material = new THREE.MeshStandardMaterial( { color: 0x808080, metalness: 0, roughness: 1 } );
    const mesh = new THREE.Mesh( geometry, material );

    const exporter = new THREE.GLTFExporter();

    return new Promise( ( resolve ) => {

      exporter.parse( mesh, resolve, {binary: true});

    } );

  }

  /** Just for debugging. */
  reduceAndDownloadGLTF () {

    const link = document.createElement( 'a' );
    link.style.display = 'none';
    document.body.appendChild( link ); // Firefox workaround, see #6594

    function save( blob, filename ) {

      link.href = URL.createObjectURL( blob );
      link.download = filename;
      link.click();

      // URL.revokeObjectURL( url ); breaks Firefox...

    }

    function saveString( text, filename ) {

      save( new Blob( [ text ], { type: 'text/plain' } ), filename );

    }


    function saveArrayBuffer( buffer, filename ) {

      save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );

    }

    this.reduceGLTF().then((content) => {
      if ( typeof content === 'string' ) {
        saveString( content, 'scene.gltf' );
      } else if ( typeof content === 'object' ) {
        saveString( JSON.stringify( content ), 'scene.gltf' );
      } else {
        saveArrayBuffer( content, 'scene.glb' );
      }
    });

  }

  getBuildList () {

    return this.content;

  }
}

module.exports = GeometryReducer;
