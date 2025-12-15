// src/ReflowCurve/core/state.js

export const Mode = Object.freeze({ Dynamic: 'dynamic', Static: 'static' });

export function initialState(opts = {}) {
  return {
    maxRampRate: 3,
    zoneCount: opts.zoneCount ?? 4,
    totalTime: opts.totalTime ?? null,  
    startTime: opts.startTime ?? null,
    maxTemperature: opts.maxTemp ?? 300, 
    
    series: opts.series ?? [],
    istGraph: opts.istGraph ?? [],
    
    isHistory: opts.isHistory ?? false,
    zoneLevels: opts.zoneLevels ?? [],
    
    // HIER DIE ÄNDERUNG: Zonen aus options übernehmen, falls vorhanden!
    zones: opts.zones ?? [], 
    
    scales: null,
    viewport: { width: 800, height: 420, pad: 42 },
    name: opts.name ?? "Hitze",
  };
}