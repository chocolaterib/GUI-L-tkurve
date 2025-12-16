


export function generateSegmentedIst(levels, coverage = 1.0, startTimeOffset = 0, zoneDuration = 300) {
  const allSegments = [];
  levels.forEach((lvl, index) => {
    const segmentPoints = [];
    const tStart = (index * zoneDuration) + startTimeOffset;
    const actualEnd = tStart + (zoneDuration * coverage);

    for (let t = tStart; t <= actualEnd; t += 2) {
      const noise = (Math.random() - 0.5) * 8;
      let val = lvl + noise;
      if (val < 0) val = 0;
      segmentPoints.push({ x: t, y: val });
    }
    allSegments.push(segmentPoints);
  });
  return allSegments;
}



export function generateRandomStepLevels(count) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * (240 - 100) + 100));
}




export function createStepSeries(levels, startTimeOffset = 0, zoneDuration = 300) {
  const points = [];
  levels.forEach((lvl, index) => {
    // Wir addieren den Offset (für globale Sicht ist Offset 0)
    const tStart = (index * zoneDuration) + startTimeOffset;
    const tEnd = ((index + 1) * zoneDuration) + startTimeOffset;
    points.push({ x: tStart, y: lvl });
    points.push({ x: tEnd, y: lvl });
  });
  return points;
}