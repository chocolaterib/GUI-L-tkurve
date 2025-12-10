// src/view/LineSeries.js
import {linspace } from '../core/sampling.js';
import { ensureD3 } from '../core/importD3.js'

export function renderIstLine(state, ctx) {
  const d3 = ensureD3();
  const { scales, istGraph } = state;
  const svg = ctx.svg;
  const g = svg.append('g').attr('class', 'ist-line-layer');
  if (!g) return;

  if (!scales) {
    return;
  }

 if (!istGraph || istGraph.length < 2) { // Mindestens 2 Punkte für ein Segment
    g.selectAll('*').remove();
    return;
  }

  const points = istGraph.map(d => ({ x: d.x, y: d.y })); 

// 1. Alle alten Segmente entfernen, falls sie noch da sind (wichtig!)
    g.selectAll('path.line-seg').remove();

    const lineGenerator = d3.line()
    .x(d => scales.x(d.x))
    .y(d => scales.y(d.y))    
    .curve(d3.curveMonotoneX);


  // Segmente rendern
  g.selectAll('path.line-seg')
    .data([points])
    .join(
      enter => enter.append('path')
        .attr('class', 'line-seg')
        .attr('fill', 'none')
        .attr('stroke-linecap', 'round')
        .attr('stroke-width', 2)
        .attr('pointer-events', 'none')
        .attr('stroke', 'lime'),
      update => update,
      exit => exit.remove()
    )
    
    .attr('d', lineGenerator);
}
