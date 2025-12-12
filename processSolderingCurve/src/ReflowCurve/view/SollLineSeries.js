import { ensureD3 } from '../core/importD3.js';

export function renderSollLine(state, ctx) {
  const d3 = ensureD3();
  const { scales, series } = state;
  const svg = ctx.svg;

  // Suche oder erstelle die Gruppe für die Soll-Linie
  let g = svg.select('g.soll-line-layer');
  if (g.empty()) {
    // Wir fügen sie VOR der Ist-Linie ein (insert), oder einfach append.
    // Die Reihenfolge lösen wir gleich final in der IstLine.js
    g = svg.append('g').attr('class', 'soll-line-layer');
  }

  g.selectAll('*').remove();

  if (!scales || !series || series.length === 0) return;

  // --- WICHTIG: curveLinear statt curveMonotoneX ---
  // Da unsere Daten bereits "eckig" sind (Stufen), wollen wir direkte Verbindungen.
  const lineGenerator = d3.line()
    .x(d => scales.x(d.x))
    .y(d => scales.y(d.y))
    .curve(d3.curveLinear); 

  g.append('path')
    .datum(series)
    .attr('fill', 'none')
    .attr('stroke', '#3b82f6') // Blau für Soll
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '5,5') // Optional: Gestrichelt zur Unterscheidung
    .attr('stroke-opacity', 0.7)
    .attr('d', lineGenerator);
}