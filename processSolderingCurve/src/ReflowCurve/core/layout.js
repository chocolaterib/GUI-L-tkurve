import { ensureD3 } from '../core/importD3.js'

export function buildScales(state) {
  const d3 = ensureD3();
  const { viewport, series } = state;
  const pad = viewport.pad ?? 32;
  const width = viewport.width ?? 800;
  const height = viewport.height ?? 420;

  const x = d3.scaleLinear().domain([state.startTime, state.totalTime]).range([width - pad, pad]);
  const y = d3.scaleLinear().domain([0,state.maxTemperature]).range([height - (pad/2), pad]);

  return { x, y, width, height, pad };
}
