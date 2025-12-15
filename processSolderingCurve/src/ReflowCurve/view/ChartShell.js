// src/view/ChartShell.js
import { ensureD3 } from '../core/importD3.js'
// nice, inklusive letztem Tick am Ende
function niceInclusiveTicks(min, max, approx = 6) {
  const span = max - min;
  if (!(span > 0) || !isFinite(span)) return [min, max];
  const n0 = Math.max(1, Math.round(approx));
  const candidates = [n0, n0 - 1, n0 + 1, n0 - 2, n0 + 2].filter(n => n > 0);

  let best = null;
  for (const n of candidates) {
    // grobe Wunschschrittweite
    const raw = span / n;
    const k = Math.floor(Math.log10(raw));
    const base = Math.pow(10, k);
    // „schöne“ Schritte rund um raw
    const nice = [1, 2, 2.5, 5, 10].map(m => m * base);
    // wähle niceStep nahe raw
    let step = nice.reduce((a, b) => (Math.abs(b - raw) < Math.abs(a - raw) ? b : a));
    // erzwinge Inklusivität: recompute n & step exakt
    const nInc = Math.max(1, Math.round(span / step));
    const stepInc = span / nInc;
    const score = Math.abs(nInc - n0) + Math.abs(Math.log10(stepInc) - Math.log10(raw)) * 0.2;
    if (!best || score < best.score) best = { n: nInc, step: stepInc, score };
  }
  const ticks = [];
  for (let i = 0; i <= best.n; i++) ticks.push(min + i * best.step);
  // numerisches Rauschen glätten
  return ticks.map(v => +v.toFixed(10));
}

function uniqSorted(arr) {
  return Array.from(new Set(arr.filter(Number.isFinite))).sort((a, b) => a - b);
}

export class ChartShell {
  constructor(root) {
    const d3 = ensureD3();
    this.root = root;
    this.svg = d3.select(root).append('svg').attr('preserveAspectRatio', 'xMinYMin meet');

    // Frame-Layer (über der Plotgruppe, unter den Achsen)


    // Plot-Layer
    const margin = { top: 0, right: 10, bottom: 30, left: 0 };

    this.g = this.svg
      .insert('g', ':first-child')      // optional: behind other layers
      .attr('class', 'plot')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    this.gGrid = {
      x: this.svg.append('g').attr('class', 'grid grid-x'),
      y: this.svg.append('g').attr('class', 'grid grid-y'),
    };

    this.gLine = this.g.append('g').attr('class', 'lines');
    this.gFrame = this.svg.append('g').attr('class', 'frame');

    // Achsen außerhalb der Plotgruppe
    this.gAxes = {
      x: this.svg.append('g').attr('class', 'axis axis-x'),
      y: this.svg.append('g').attr('class', 'axis axis-y'),
    };

    this.gGrid.x.lower();
    this.gGrid.y.lower();

    this.gLabel = this.svg.append('g').attr('class', 'label');

    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const r = e.contentRect;
        this.onResize && this.onResize({ width: r.width, height: r.height });
      }
    });
    ro.observe(root);
    this._ro = ro;
  }

  update(state) {
    const S = state.scales;
    if (!S || !S.x || !S.y) return;

    this.svg.attr('viewBox', `0 0 ${S.width} ${S.height}`);

    const [x0, x1] = S.x.domain();
    const yDom = S.y.domain();
    const yMax = Number.isFinite(state.maxTemperature) ? state.maxTemperature : yDom[1];

    // ---- X-Ticks bestimmen ----
    const fmtInt = d3.format(',.0f');
    let xAxis;

    // Zonen-Grenzen + immer das Ende der Gesamtzeit
    const zoneEnds = Array.isArray(state.zones) ? state.zones.map(z => z.tEnd) : [];
    const xTicks = uniqSorted([...zoneEnds, x1]);
    xAxis = d3.axisBottom(S.x).tickValues(xTicks).tickFormat(d => `${Math.round(d)}s`);
    
    // ---- Y-Ticks: 0 .. yMax, inkl. letztem Tick oben ----
    const approxY = state.axis?.yTicks ?? 8;
    const yTicks = niceInclusiveTicks(0, yMax, approxY);


    const yAxis = d3.axisRight(S.y).tickValues(yTicks).tickFormat(d => `${Math.round(d)}°C`);


    this.gAxes.x
      .attr('transform', `translate(0, ${S.height - (S.pad/2)})`)
      .call(xAxis)
      .call(g => {
        g.selectAll('.domain')      // Achsenlinie
          .attr('stroke-width', 2)
          .attr('vector-effect', 'non-scaling-stroke') // bleibt bei Zoom gleich dick
          .attr('stroke', '#000000ff');
        g.selectAll('.tick line')   // Tick-Striche
          .attr('stroke-width', 1)
          .attr('vector-effect', 'non-scaling-stroke');
      });
    this.gAxes.y
      .attr('transform', `translate(${S.width - S.pad}, 0)`)
      .call(yAxis)
      .call(g => {
        g.selectAll('.domain')      // Achsenlinie
          .attr('stroke-width', 2)
          .attr('vector-effect', 'non-scaling-stroke') // bleibt bei Zoom gleich dick
          .attr('stroke', '#000000ff');
        g.selectAll('.tick line')   // Tick-Striche
          .attr('stroke-width', 1)
          .attr('vector-effect', 'non-scaling-stroke');
      });


    // ---- Rahmen oben & links (entlang des Plot-Innenbereichs) ----
    const frameData = [
      { id: 'top', x1: S.pad, y1: S.pad, x2: S.width - (S.pad - 1), y2: S.pad },
      { id: 'left', x1: S.pad, y1: S.pad, x2: S.pad, y2: S.height - (S.pad/2) },
    ];

    const strokeColor = '#334155';   // Slate-700 – gern an Theme binden

    this.gFrame
      .selectAll('line.frame-line')
      .data(frameData, d => d.id)
      .join(
        enter => enter.append('line')
          .attr('class', 'frame-line')
          .attr('pointer-events', 'none')
          .attr('shape-rendering', 'crispEdges')
          .attr('stroke', strokeColor)
          .attr('stroke-width', 2),
        update => update,
        exit => exit.remove()
      )
      .attr('x1', d => d.x1)
      .attr('y1', d => d.y1)
      .attr('x2', d => d.x2)
      .attr('y2', d => d.y2);

    // ---- (optional) Rahmen im Non-Static-Modus wie gehabt ----e
      const W = S.width - 2 * S.pad;
      const H = S.height - 2 * S.pad;

      // x-Ticks: vertikale Linien
      const xTicksForGrid = xAxis.tickArguments?.()[0] || (xAxis.tickValues ? xAxis.tickValues() : []);
      const xVals = xAxis.tickValues ? xAxis.tickValues() : xTicksForGrid; // robust

      this.gGrid.x
        .selectAll('line.grid-x-line')
        .data(xVals ?? [], d => d)
        .join(
          enter => enter.append('line')
            .attr('class', 'grid-x-line')
            .attr('pointer-events', 'none')
            .attr('shape-rendering', 'crispEdges')
            .attr('stroke', '#535455ff')    // slate-400
            .attr('stroke-opacity', 0.70)
            .attr('stroke-width', 1),
          update => update,
          exit => exit.remove()
        )
        .attr('x1', d => S.x(d))
        .attr('x2', d => S.x(d))
        .attr('y1', S.pad)
        .attr('y2', S.height -  (S.pad/2));

      // y-Ticks: horizontale Linien (wir nehmen deine berechneten yTicks)
      const yVals = yTicks; // aus deinem Code oben

      this.gGrid.y
        .selectAll('line.grid-y-line')
        .data(yVals ?? [], d => d)
        .join(
          enter => enter.append('line')
            .attr('class', 'grid-y-line')
            .attr('pointer-events', 'none')
            .attr('shape-rendering', 'crispEdges')
            .attr('stroke', '#4b4e52ff')
            .attr('stroke-opacity', 0.70) // etwas dezenter als x
            .attr('stroke-width', 1),
          update => update,
          exit => exit.remove()
        )
        .attr('x1', S.pad)
        .attr('x2', S.width - S.pad)
        .attr('y1', d => S.y(d))
        .attr('y2', d => S.y(d));

    const labelLayer = this.gLabel;

    if (state.name) {   // z.B. 'Luft', 'Oberhitze', 'Unterhitze'
      const [rx0, rx1] = S.x.range();
      const centerX = (rx0 + rx1) / 2;

      const plotY = S.pad - 23;

      labelLayer
        .selectAll('text.chart-label')
        .data([state.name])
        .join(
          enter => enter.append('text')
            .attr('class', 'chart-label')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('pointer-events', 'none')
            .attr('fill', '#000000ff')
            .attr('font-size', 20)
            .attr('font-weight', '600'),
          update => update
        )
        .attr('x', centerX)
        .attr('y', plotY)
        .text(d => d);
    } else {
      // falls kein Titel → Label entfernen
      this.gFrame.selectAll('text.chart-label').remove();
    }
  }


  get ctx() {
    return {
      svg: this.svg,
      gLine: this.gLine,
    };
  }
}

