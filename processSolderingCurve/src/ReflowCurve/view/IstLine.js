import { ensureD3 } from '../core/importD3.js'

export function renderIstLine(state, ctx) {
  const d3 = ensureD3();
  const { scales, istGraph, isHistory } = state;
  const svg = ctx.svg;

  let g = svg.select('g.ist-line-layer');
  if (g.empty()) {
    g = svg.append('g').attr('class', 'ist-line-layer');
  }

  // --- WICHTIG: Nach oben holen ---
  // Das sorgt dafür, dass die Ist-Linie ÜBER der Soll-Linie liegt
  g.raise(); 

  g.selectAll('*').remove();

  if (!scales || !istGraph || istGraph.length === 0) return;

  const lineGenerator = d3.line()
    .x(d => scales.x(d.x))
    .y(d => scales.y(d.y))
    .curve(d3.curveMonotoneX); // Hier darf es weich sein (Ist-Werte rauschen)

  const strokeColor = isHistory ? '#6b7280' : 'lime';
  const strokeWidth = isHistory ? 2 : 3;
  const opacity = isHistory ? 0.8 : 1.0;

  // Prüfung: Segmente (Historie) oder flache Liste (Live)?
  const isSegmented = Array.isArray(istGraph[0]);

  if (isSegmented) {
    istGraph.forEach(segment => {
      if (!segment || segment.length < 2) return;
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
    });
  } else {
    // Live Graph
    if (istGraph.length < 2) return;
    g.append('path')
      .datum(istGraph)
      .attr('fill', 'none')
      .attr('stroke', strokeColor)
      .attr('stroke-width', strokeWidth)
      .attr('stroke-opacity', opacity)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .style('pointer-events', 'none')
      .attr('d', lineGenerator);
  }
}