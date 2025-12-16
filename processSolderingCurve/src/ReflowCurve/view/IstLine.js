import { ensureD3 } from '../core/importD3.js'

export function renderIstLine(state, ctx) {
  const d3 = ensureD3();
  const { scales, istGraph, isHistory } = state; 
  const svg = ctx.svg;

  let g = svg.select('g.ist-line-layer');
  if (g.empty()) {
    g = svg.append('g').attr('class', 'ist-line-layer');
  }

  g.raise(); 

  g.selectAll('*').remove();

  if (!scales || !istGraph || istGraph.length === 0) return;

  const segments = Array.isArray(istGraph[0]) ? istGraph : [istGraph];

  // --- Farben ---
  // Wir bleiben bei Grün für beides, wie im vorherigen Schritt gewünscht
  const strokeColor = 'lime'; 
  const strokeWidth = isHistory ? 2 : 3; // Historie etwas dünner
  const opacity = isHistory ? 0.6 : 1.0; // Historie etwas transparenter für bessere Lesbarkeit
  
  const gradId = isHistory ? 'grad-ist-history' : 'grad-ist-live';

  let defs = svg.select('defs');
  if (defs.empty()) {
    defs = svg.append('defs');
  }

  defs.selectAll(`.${gradId}`).remove();

  const gradient = defs.append('linearGradient')
    .attr('id', gradId)
    .attr('class', gradId)
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%'); 

  gradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', strokeColor)
    .attr('stop-opacity', isHistory ? 0.2 : 0.4); // Historie schwächerer Verlauf

  gradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', strokeColor)
    .attr('stop-opacity', 0.0); 

  // --- Generatoren ---
  const lineGenerator = d3.line()
    .x(d => scales.x(d.x))
    .y(d => scales.y(d.y))
    .curve(d3.curveMonotoneX);

  const areaGenerator = d3.area()
    .x(d => scales.x(d.x))
    .y0(scales.y.range()[0])
    .y1(d => scales.y(d.y))
    .curve(d3.curveMonotoneX);

  // --- Rendering ---
  segments.forEach(segment => {
    if (!segment || segment.length < 2) return;

    // A) Area (Farbverlauf)
    g.append('path')
      .datum(segment)
      .attr('fill', `url(#${gradId})`)
      .attr('d', areaGenerator)
      .style('pointer-events', 'none');

    // B) Linie
    g.append('path')
      .datum(segment)
      .attr('fill', 'none')
      .attr('stroke', strokeColor)
      .attr('stroke-width', strokeWidth)
      .attr('stroke-opacity', opacity)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .style('pointer-events', 'none')
      .attr('d', lineGenerator);

    // C) Punkt & Label am Ende -> NUR WENN NICHT HISTORIE
    if (!isHistory) {
        const lastPoint = segment[segment.length - 1];
        const px = scales.x(lastPoint.x);
        const py = scales.y(lastPoint.y);

        // Marker-Kreis
        g.append('circle')
          .attr('cx', px)
          .attr('cy', py)
          .attr('r', 4)
          .attr('fill', strokeColor)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);

        // Label Text
        g.append('text')
          .attr('x', px)
          .attr('y', py - 12) 
          .attr('text-anchor', 'middle')
          .attr('fill', '#000')
          .style('font-size', '11px')
          .style('font-weight', 'bold')
          .style('text-shadow', '1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff')
          .text(`${Math.round(lastPoint.y)}°C`);
    }
  });
}