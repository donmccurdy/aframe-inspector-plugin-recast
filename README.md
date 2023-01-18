# Navigation Mesh A-Frame Inspector Plugin

> 🚨 **NOTICE:** _This project is now unmaintained, for lack of a reliable [Recast](https://github.com/recastnavigation/recastnavigation) WASM build. See [#48](https://github.com/donmccurdy/aframe-inspector-plugin-recast/issues/48) for details._

A plugin for the A-Frame Inspector, allowing creation of a navigation mesh while from an existing A-Frame scene. This plugin should not be used at runtime in the live scene, but only during scene creation.

1. Create your scene
2. Use this plugin to create and test a navigation mesh
3. Export the navigation mesh as a glTF or JSON file
4. Load the final navigation mesh into your scene as a normal model

![plugin screenshot](https://user-images.githubusercontent.com/1848368/40598442-a2d92fac-61fc-11e8-9dfe-4de1c56ee6e6.gif)

> [Kitchen v2](https://poly.google.com/view/dC70BOz1Ju-) by Jerad Bitner, on Google Poly.

## Introduction

A navigation mesh helps AI agents navigate, and is one way of constraining first-person controls and VR teleportation within a playable area. For information about using a navigation mesh in A-Frame, see [Pathfinding documentation in A-Frame Extras](https://github.com/donmccurdy/aframe-extras/tree/master/src/pathfinding).

## Installation

1. Add this script to an existing scene, installing the inspector plugin:

```html
<script src="https://recast-api.donmccurdy.com/aframe-inspector-plugin-recast.js"></script>
```

2. Add the plugin component to your scene:

```html
<a-scene inspector-plugin-recast> ...
```

3. Configure settings if needed, and press *Build*.

4. Close the inspector and test the navigation mesh, either using the [usual instructions](https://github.com/donmccurdy/aframe-extras/tree/master/src/pathfinding) or the included `nav-debug-pointer` component.

5. If things are working properly, use the *Export* button to save your finished navigation mesh as a `.gltf` file.

6. Load the navigation mesh into your finished scene with the [documentation in A-Frame Extras](https://github.com/donmccurdy/aframe-extras/tree/master/src/pathfinding).

## Configuration

<!-- begin:config -->
| property | default | description |
|----------|---------|-------------|
| cellSize | 0.3 | Width/depth of voxel cells used to sample scene geometry. 0.05 — 3. |
| cellHeight | 0.2 | Height of voxel cells used to sample scene geometry. 0.1 — 3. |
| agentHeight | 1.6 | Minimum floor to 'ceiling' height that will still allow the floor area to be considered walkable. Permits detection of overhangs in the source geometry that make the geometry below un-walkable. The value is usually set to the maximum agent height. 0.1 — 3. |
| agentRadius | 0.2 | The distance to erode/shrink the walkable area of the heightfield away from obstructions. In general, this is the closest any part of the final mesh should get to an obstruction in the source geometry. It is usually set to the maximum agent radius. Areas too narrow will be considered "blocked." 0.1 — 3. |
| agentMaxClimb | 0.5 | Maximum ledge height that is considered to still be traversable. Allows the mesh to flow over low lying obstructions such as curbs and up/down stairways. The value is usually set to how far up/down an agent can step. 0.1 — 5. |
| agentMaxSlope | 30 | The maximum slope that is considered walkable. 0 — 90. |
<!-- end:config -->


## Tips, limits, and performance

This plugin sends scene geometry temporarily to a remote API for processing, and imposes limits on the size of the processed scene for that reason. Suggestions for getting started:

* Detailed objects with large filesize may be replaced with boxes to simplify creation of the navigation mesh.
* Objects with large dimensions like `<a-sky/>`, that are not intended for navigation, should be omitted while creating the mesh.
* To omit objects from the navigation mesh, delete them temporarily from the scene, or using the `selector` input.

Improving results when something doesn't look right:

* If the navigation mesh is too coarse or inaccurate, try reducing `cellSize` to increase precision.
* `agentHeight` determines when overhangs will block movement. `agentRadius` determines how narrow a space is passable.
* `agentMaxClimb` should be just greater than the largest stairsteps or curbs a character can walk over.
* For more information, hover over any input in the plugin.
* Final cleanup, if necessary, may be done in a modeling tool like Blender.

If you need to create a navigation mesh for larger scenes, run the plugin's navmesh service locally after cloning this repository:

```
npm run dev
```

```html
<a-scene inspector-plugin-recast="serviceURL: http://localhost:3000;"> ...
```

## Debugging

This plugin includes an additional component for teleporting around a navigation mesh, `nav-debug-pointer`. It can be used alongside `movement-controls` to test out the navigation mesh with FPS-style movement. The cursor will display in green while looking at the navigation mesh, red while looking away, and allows teleporting to any part of the navigation mesh. The `movement-controls` component supports clamping player WASD movement within the mesh. AI pathfinding is described in [further documentation](https://github.com/donmccurdy/aframe-extras/tree/master/src/pathfinding).

```
<a-entity id="rig" movement-controls="constrainToNavMesh: true">
  <a-entity camera
            position="0 1.6 0"
            look-controls>
    <a-cursor nav-debug-pointer raycaster="objects: [nav-mesh];"></a-cursor>
  </a-entity>
</a-entity>
```

Adjust settings as needed if the navigation mesh is not appropriate. Final adjustments (correcting distortions, or adding/removing connections to particular areas) can also be applied in any modeling tool.

## Credits

Thanks to:

- [Recast Navigation](https://github.com/recastnavigation/recastnavigation), used for building navigation meshes.
- [Jeff Ma](https://github.com/but0n) for creating a [Node.js-friendly build of Recast](https://github.com/but0n/recastCLI.js).
