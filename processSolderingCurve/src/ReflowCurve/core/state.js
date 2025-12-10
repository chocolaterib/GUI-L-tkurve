export const Mode = Object.freeze({ Dynamic: 'dynamic', Static: 'static' });

export function initialState(opts = {}) {
  return {
    maxRampRate: 3,
    zoneCount: opts.zoneCount ?? 4,
    totalTime: opts.totalTime ?? null,  
    startTime: opts.startTime ?? null,
    maxTemperature: opts.maxTemp ?? 300, 
    series: opts.series ?? [],        // [{x, y}] sorted by x
    istGraph: opts.istGraph ?? [],    // [{x,y}]
    scales: null,                     // {x, y}
    viewport: { width: 800, height: 420, pad: 42 },
    zones: [],
    zoneCount: opts.zoneCount ?? 4,
    name: opts.name ?? "Hitze",
  };
}
