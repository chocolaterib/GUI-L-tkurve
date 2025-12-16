// src/core/zones.js
export function computeEqualZones(tMin, tMax, zoneCount) {
  const n = Math.max(1, Math.floor(zoneCount || 1));
  const total = tMax - tMin;
  if (!Number.isFinite(total) || total <= 0) return [];
  const dur = total / n;

  const zones = [];
  for (let i = 0; i < n; i++) {
    const start = tMin + i * dur;
    const end   = (i === n - 1) ? tMax : (start + dur);
    zones.push({ tStart: start, tEnd: end });
  }
  return zones;
}

export function computeEqualZonesFromSeries(series, zoneCount) {
  if (!Array.isArray(series) || series.length < 2) return [];
  const s = [...series].map(p => ({ x: p.x ?? p.t, y: p.y ?? p.temp }))
                       .sort((a,b) => a.x - b.x);
  const tMin = s[0].x;
  const tMax = s[s.length - 1].x;
  return computeEqualZones(tMin, tMax, zoneCount);
}
