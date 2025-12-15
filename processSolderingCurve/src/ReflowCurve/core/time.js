// src/core/time.js
export function seriesExtent(series) {
  if (!Array.isArray(series) || series.length === 0) return null;
  const xs = series.map(p => p.x ?? p.t);
  const tMin = Math.min(...xs);
  const tMax = Math.max(...xs);
  return { tMin, tMax, duration: tMax - tMin };
}

// skaliert die Serie linear auf gewünschte Gesamtzeit
export function scaleSeriesToTotalTime(series, totalTime) {
  if (!Array.isArray(series) || series.length === 0) return series;
  const ext = seriesExtent(series);
  if (!ext || !Number.isFinite(totalTime) || totalTime <= 0) return series;

  const { tMin, tMax, duration } = ext;
  // Sonderfall: nur 1 Punkt -> setze ihn ans Ende
  if (series.length === 1) {
    const base = 0 ;
    return [{ x: base + totalTime, y: series[0].y }];
  }
  const scale = duration > 0 ? (totalTime / duration) : 1;

  const base = 0;
  // Schritt 1: auf 0 normen (x - tMin), Schritt 2: skalieren, Schritt 3: versetzen
  return series.map(p => {
    const x = ( (p.x ?? p.t) - tMin ) * scale + base;
    const y = p.y ?? p.temp;
    return { x, y };
  });
}

export function computeEqualZonesByTotal(totalTime, zoneCount, origin = 0) {
  const n = Math.max(1, Math.floor(zoneCount || 1));
  if (!Number.isFinite(totalTime) || totalTime <= 0) return [];
  const dur = totalTime / n;
  const zones = [];
  for (let i = 0; i < n; i++) {
    const start = origin + i * dur;
    const end   = (i === n - 1) ? (origin + totalTime) : (start + dur);
    zones.push({ tStart: start, tEnd: end });
  }
  return zones;
}
