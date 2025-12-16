// src/view/ZoneGrid.js
import { ensureD3 } from '../core/importD3.js';
import { buildScales } from '../core/layout.js'; 
import { renderSollLine } from './SollLineSeries.js';
import { renderIstLine } from './IstLine.js';
import { ChartShell } from './ChartShell.js';

// Globale Variable für den Hide-Timer (außerhalb der Funktion, damit er persistent ist)
let tooltipHideTimer = null;

export function renderZoneGrid(state, ctx, callbacks = {}) {
  const d3 = ensureD3();
  const { scales, zoneCount, totalTime, startTime, series, istGraph, maxTemperature } = state;
  const { onZoneClick, renderTooltip } = callbacks;
  const svg = ctx.svg;

  // --- TOOLTIP SETUP ---
  let tooltip = d3.select('body').select('.zone-tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div')
      .attr('class', 'zone-tooltip')
      .style('opacity', 0);
      
    // WICHTIG: Event-Listener auf dem Tooltip selbst!
    // Wenn Maus auf den Tooltip geht -> Timer stoppen -> Tooltip bleibt offen
    tooltip.on('mouseenter', () => {
        if (tooltipHideTimer) {
            clearTimeout(tooltipHideTimer);
            tooltipHideTimer = null;
        }
    });
    
    // Wenn Maus den Tooltip verlässt -> Tooltip schließen
    tooltip.on('mouseleave', () => {
        tooltipHideTimer = setTimeout(() => {
            tooltip.style('opacity', 0).style('pointer-events', 'none'); 
            // pointer-events none setzen, damit er nicht im Weg ist, wenn er unsichtbar ist
        }, 100);
    });
  }

  // Gruppen Setup
  let group = svg.select('g.zones');
  if (group.empty()) {
    group = svg.append('g').attr('class', 'zones').lower(); 
  }

  if (!scales || !zoneCount || !totalTime) {
    group.selectAll('*').remove();
    return;
  }

  // --- BERECHNUNGEN ---
  const yRange = scales.y.range();
  const chartHeight = Math.abs(yRange[0] - yRange[1]);
  const yTop = Math.min(yRange[0], yRange[1]); 
  const startVal = new Date(startTime).getTime(); 
  const zoneDuration = totalTime / zoneCount;
  const zones = [];

  for (let i = 0; i < zoneCount; i++) {
    zones.push({
      index: i + 1,
      xStart: startVal + (i * zoneDuration),
      xEnd: startVal + ((i + 1) * zoneDuration),
      duration: zoneDuration
    });
  }

  // --- RENDERING ---
 group.selectAll('*').remove()
  // A. Hintergrund (Zebra)
  group.selectAll('rect.zone-bg')
    .data(zones.filter(d => d.index % 2 !== 0), d => d.index)
    .join('rect')
      .attr('class', 'zone-bg')
      .attr('fill', '#e5e5e5')
      .attr('opacity', 0.5)
      .style('pointer-events', 'none') // Klicks gehen durch an Hitbox
      .attr('x', d => Math.min(scales.x(d.xStart), scales.x(d.xEnd)))
      .attr('y', yTop)
      .attr('width', d => Math.abs(scales.x(d.xStart) - scales.x(d.xEnd)))
      .attr('height', chartHeight);

  // B. Hitboxen (Interaktion)
  group.selectAll('rect.zone-hitbox')
    .data(zones, d => d.index)
    .join(
      enter => enter.append('rect')
        .style('fill', 'transparent')
    )
    .attr('x', d => Math.min(scales.x(d.xStart), scales.x(d.xEnd)))
    .attr('y', yTop)
    .attr('width', d => Math.abs(scales.x(d.xStart) - scales.x(d.xEnd)))
    .attr('height', chartHeight)
    
  // C. Linien & Labels
  group.selectAll('line.zone-divider')
    .data(zones, d => d.index)
    .join('line')
    .style('pointer-events', 'none')
    .attr('x1', d => scales.x(d.xStart))
    .attr('x2', d => scales.x(d.xStart))
    .attr('y1', yTop)
    .attr('y2', yTop + chartHeight)
    .attr('stroke', '#9ca3af').attr('stroke-dasharray', '4,4');

  group.selectAll('text.zone-label')
    .data(zones, d => d.index)
    .join('text')
    .style('pointer-events', 'none')
    .attr('x', d => scales.x(d.xStart) + 5)
    .attr('y', yTop + 15)
    .text(d => `Z${d.index}`)
    .attr('fill', '#6b7280');
}

/**
 * Zeichnet einen extrabreiten Graphen und scrollt zur richtigen Stelle
 */
function drawScrollableChart({ 
  windowDiv, contentDiv, series, istGraph, totalTime, startTime, maxTemperature, 
  zoneStart, zoneEnd, globalStartVal 
}) {
    contentDiv.html('');

    // 1. Dimensionen festlegen
    // Fenster ist z.B. 500px breit
    const windowWidth = parseFloat(windowDiv.style('width')) || 500;
    const height = parseFloat(windowDiv.style('height')) || 300;
    
    // Der Inhalt soll BREITER sein -> Scrollbar entsteht
    // Wir machen ihn z.B. 3x so breit wie das Fenster oder proportional zur Zeit
    const contentWidth = 1500; 

    // Styles setzen
    contentDiv.style('width', contentWidth + 'px').style('height', height + 'px');

    // 2. ChartShell initialisieren (im breiten Container)
    const shell = new ChartShell(contentDiv.node());

    // 3. Mini-State für den gesamten Zeitverlauf (0 bis TotalTime)
    // Aber auf 1500px Breite gestreckt!
    const miniState = {
        viewport: { width: contentWidth, height, pad: 40 },
        startTime: 0,         // Gesamter Verlauf Start
        totalTime: totalTime, // Gesamter Verlauf Ende (300)
        maxTemperature: maxTemperature || 300,
        series: series,
        istGraph: istGraph,
        scales: null,
        axis: { xTicks: 15, yTicks: 6 }, // Mehr Ticks auf der X-Achse
        name: null 
    };

    miniState.scales = buildScales(miniState);
    shell.update(miniState);

    // 4. Highlight Rechteck (Damit man weiß, welche Zone man ansieht)
    const { x } = miniState.scales;
    const relStart = zoneStart - globalStartVal;
    const relEnd = zoneEnd - globalStartVal;
    
    // Positionen berechnen
    const x1 = x(relStart);
    const x2 = x(relEnd);

    // Gelbes Highlight einfügen
    shell.ctx.svg.select('.plot')
        .insert('rect', '.lines')
        .attr('x', x1)
        .attr('y', 0)
        .attr('width', Math.max(1, x2 - x1))
        .attr('height', miniState.viewport.height - miniState.viewport.pad)
        .attr('fill', 'rgba(255, 204, 0, 0.3)')
        .attr('stroke', 'none');

    // 5. Kurven zeichnen
    renderSollLine(miniState, shell.ctx);
    if (istGraph && istGraph.length > 0) {
        renderIstLine(miniState, shell.ctx);
    }
    
    // 6. AUTO-SCROLL zur Zone
    // Wir wollen, dass die Zone in der Mitte des Fensters steht
    const zoneCenter = x1 + (x2 - x1) / 2;
    const scrollPos = zoneCenter - (windowWidth / 2);
    
    // Scrollen (JS property scrollLeft auf dem Window Div)
    windowDiv.property('scrollLeft', scrollPos);
}