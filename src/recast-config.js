const RecastConfig = [
  {name: 'cellSize', min: 0.1, max: 3, step: 0.01 },
  {name: 'cellHeight', min: 0.1, max: 3, step: 0.01 },
  {name: 'agentHeight', min: 0.1, max: 3, step: 0.01 },
  {name: 'agentRadius', min: 0.1, max: 3, step: 0.01 },
  {name: 'agentMaxClimb', min: 0.1, max: 5, step: 0.01 },
  {name: 'agentMaxSlope', min: 0, max: 90, step: 1 }
];

module.exports = RecastConfig;
