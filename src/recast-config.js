const RecastConfig = [
  {
    name: 'cellSize',
    default: 0.3,
    min: 0.05,
    max: 3,
    step: 0.01,
    description: 'Width/depth of voxel cells used to sample scene geometry.'
  },
  {
    name: 'cellHeight',
    default: 0.2,
    min: 0.1,
    max: 3,
    step: 0.01,
    description: 'Height of voxel cells used to sample scene geometry.'
  },
  {
    name: 'agentHeight',
    default: 1.6,
    min: 0.1,
    max: 3,
    step: 0.01,
    description:
`Minimum floor to 'ceiling' height that will still allow the floor
area to be considered walkable. Permits detection of overhangs in
the source geometry that make the geometry below un-walkable. The
value is usually set to the maximum agent height.`
  },
  {
    name: 'agentRadius',
    default: 0.2,
    min: 0.1,
    max: 3,
    step: 0.01,
    description:
`The distance to erode/shrink the walkable area of the heightfield
away from obstructions. In general, this is the closest any part
of the final mesh should get to an obstruction in the source geometry.
It is usually set to the maximum agent radius. Areas too narrow will
be considered "blocked."`
  },
  {
    name: 'agentMaxClimb',
    default: 0.5,
    min: 0.1,
    max: 5,
    step: 0.01,
    description:
`Maximum ledge height that is considered to still be traversable.
Allows the mesh to flow over low lying obstructions such as curbs
and up/down stairways. The value is usually set to how far up/down
an agent can step.`
  },
  {
    name: 'agentMaxSlope',
    default: 30,
    min: 0,
    max: 90,
    step: 1,
    description: 'The maximum slope that is considered walkable.'
  }
];

// Remove line returns.
RecastConfig.map((param) => {
  param.description = param.description.replace(/\n/g, ' ');
});

module.exports = RecastConfig;
