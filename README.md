# Navigation Mesh A-Frame Inspector Plugin

> WORK IN PROGRESS: This plugin is not yet stable or ready for use.

A plugin for the A-Frame Inspector, allowing creation of a navigation mesh while from an existing A-Frame scene. This plugin should not be used at runtime in the live scene, but only during scene creation.

1. Create your scene
2. Use this plugin to create and test a navigation mesh
3. Export the navigation mesh as a glTF or JSON file
4. Load the final navigation mesh into your scene as a normal model

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

## Limits and performance

This plugin sends scene geometry temporarily to a remote API for processing, and imposes limits on the size of the processed scene for that reason. Additionally, objects with large dimensions like `<a-sky/>` that are not intended for navigation should be omitted while creating the mesh — either by commenting them out, or using the `selector` input.

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
