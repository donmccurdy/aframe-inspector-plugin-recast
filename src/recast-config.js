const RecastConfig = [
  {name: 'cellSize', default: 0.3, min: 0.1, max: 3, step: 0.01 },
  {name: 'cellHeight', default: 0.2, min: 0.1, max: 3, step: 0.01 },
  {name: 'agentHeight', default: 0.8, min: 0.1, max: 3, step: 0.01 },
  {name: 'agentRadius', default: 0.2, min: 0.1, max: 3, step: 0.01 },
  {name: 'agentMaxClimb', default: 0.5, min: 0.1, max: 5, step: 0.01 },
  {name: 'agentMaxSlope', default: 30, min: 0, max: 90, step: 1 }
];

module.exports = RecastConfig;
