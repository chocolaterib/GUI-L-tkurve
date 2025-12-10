// src/view/LineSeries.js
import { samplePCHIP, linspace } from '../core/sampling.js';
import { ensureD3 } from '../core/importD3.js'

export function renderLineSeries(state, ctx) {
  const d3 = ensureD3();
  const { series, scales } = state;
  const svg = ctx.svg;
  const g = svg.append('g').attr('class', 'soll-line');
  if (!g) return;

  if (!series || series.length === 0) {
    g.selectAll('*').remove();
    return;
  }

  // 1) X-Range + Sampling
  const [minX, maxX] = [series[0].x, series[series.length - 1].x];
  const xs = linspace(minX, maxX, 400);

  // 2) PCHIP
  let smooth;
  try {
    smooth = samplePCHIP(series, xs);
  } catch (e) {
    console.warn('PCHIP fallback:', e);
    smooth = series.map(p => p.y);
  }

  if (!Array.isArray(xs) || xs.length !== smooth.length) {
    console.warn('xs and smooth length mismatch', xs?.length, smooth?.length);
    return;
  }

  // 3) Punkte
  const points = xs.map((x, i) => ({ x, y: Number(smooth[i]) }));

  // ---------- Farbskala wie im Bar-Overlay ----------
  const [yMin, yMax] = scales.y.domain();
  const T_MIN = 0;
  const T_MAX = Math.max(300, yMax); // deckt >300 ab

  const clamp01 = t => Math.max(0, Math.min(1, t));
  const easeTemp = (temp) => {
    const tLin = clamp01((Number(temp) - T_MIN) / (T_MAX - T_MIN));
    const t = d3.easeCubicOut(tLin); // feinere Abstufung unten
    return T_MIN + t * (T_MAX - T_MIN);
  };

  const colorStops = [
    [   0, '#1e3a8a'], // blau
    [  60, '#0ea5e9'], // cyan
    [ 120, '#10b981'], // grün/teal (sanft)
    [ 200, '#fde047'], // gelb (gedämpft)
    [ 250, '#f59e0b'], // orange
    [ 270, '#d73027'], // rot
    [ T_MAX, '#7f0000'], // dunkelrot
  ];

  const colorScaleDeg = d3.scaleLinear()
    .domain(colorStops.map(d => d[0]))
    .range(colorStops.map(d => d[1]))
    .interpolate(d3.interpolateHclLong);

  const colorForTemp = (temp) => colorScaleDeg(easeTemp(Number.isFinite(temp) ? temp : T_MIN));

  // 4) In Segmente zerlegen und farbig zeichnen
  //    jedes Segment: [p_i -> p_{i+1}], Farbe ~ Mitteltemperatur
  const segs = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(b.x) || !Number.isFinite(b.y)) continue;
    segs.push({
      i,
      x1: scales.x(a.x), y1: scales.y(a.y),
      x2: scales.x(b.x), y2: scales.y(b.y),
      tMid: (a.y + b.y) / 2
    });
  }

  // Clean der alten einteiligen Linie (falls vorhanden)
  g.selectAll('path.line').remove();

  // Segmente rendern
  g.selectAll('path.line-seg')
    .data(segs, d => d.i)
    .join(
      enter => enter.append('path')
        .attr('class', 'line-seg')
        .attr('fill', 'none')
        .attr('stroke-linecap', 'round')
        .attr('stroke-width', 2)
        .attr('pointer-events', 'none'),
      update => update,
      exit => exit.remove()
    )
    .attr('stroke', d => colorForTemp(d.tMid))
    .attr('d', d => `M${d.x1},${d.y1}L${d.x2},${d.y2}`);
}
