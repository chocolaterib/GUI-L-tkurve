import { createReflowGraph } from './ReflowCurve/app/ReflowGraph.js';
import { AC } from './ReflowCurve/core/events.js';
import { mountControls } from './ui/Controls.js';

export function initReflowGraph(options = {}) {
  const appRoot = document.getElementById('app');

  // ---------- Toolbar ----------
  const toolbar = document.createElement('div');
  toolbar.style.display = 'flex';
  toolbar.style.gap = '8px';
  toolbar.style.margin = '8px 0';

  appRoot.appendChild(toolbar);

  // ---------- Overlay-Wrapper (übereinander) ----------
  const graphsWrapper = document.createElement('div');
  graphsWrapper.id = 'graphs-wrapper';
  graphsWrapper.style.display = 'grid';
  // 1st row (Air) small, 2nd + 3rd rows (Top/Bottom) larger
  graphsWrapper.style.gridTemplateRows = '0.9fr 0.9fr';
  // Fill viewport minus toolbar; adjust if needed
  graphsWrapper.style.height = 'calc(100vh - 60px)';
  graphsWrapper.style.gap = '8px';

  // IMPORTANT: allow children to shrink properly
  graphsWrapper.style.minHeight = '0';

  appRoot.appendChild(graphsWrapper);

  const graphRootTop = document.createElement('div');
  graphRootTop.id = 'graph-top';
  graphRootTop.style.minHeight = '0';
  graphRootTop.style.position = 'relative';

  const graphRootBottom = document.createElement('div');
  graphRootBottom.id = 'graph-bottom';
  graphRootBottom.style.minHeight = '0';
  graphRootBottom.style.position = 'relative';

  graphsWrapper.appendChild(graphRootTop);
  graphsWrapper.appendChild(graphRootBottom);

  // Controls-Bereich darunter (optional getrennt pro Kurve)
  const controlsRow = document.createElement('div');
  controlsRow.style.display = 'flex';
  controlsRow.style.gap = '24px';
  controlsRow.style.marginTop = '8px';
  appRoot.appendChild(controlsRow);

  const controlsHost = document.createElement('div');
  controlsRow.appendChild(controlsHost);

  // ---------- Daten ----------
  const totalTime = 300;
  const maxTemp = 300;

  // Top (Oberhitze)
  const seriesTop = [
    { x: 0, y: 85 },
    { x: 90, y: 150 },
    { x: 150, y: 170 },
    { x: 210, y: 245 },
    { x: 230, y: 245 },
    { x: 300, y: 110 }
  ];
  const zonesCount = 12;

  // Bottom (Unterhitze)
  const seriesBottom = [
    { x: 0, y: 85 },
    { x: 90, y: 140 },
    { x: 150, y: 165 },
    { x: 210, y: 230 },
    { x: 230, y: 230 },
    { x: 300, y: 100 }
  ];


  // Bottom (Unterhitze)
  const seriesBottomIst = [
    { x: 0, y: 85 },
    { x: 90, y: 140 },
    { x: 150, y: 165 },
    { x: 210, y: 230 },
    { x: 230, y: 230 } 
   ];


  const bottomName = "Unterhitze";
  const topName = "Oberhitze";


  // ---------- Instanzen (beide in gleicher Größe) ----------
  const appTop = createReflowGraph(graphRootTop, {
    series: seriesTop.map(p => ({ ...p })),
    zoneCount: zonesCount,
    istGraph: seriesBottomIst,
    startTime: 0,
    totalTime,
    maxTemp,
    name: topName,
  });
  appTop.dispatch(AC.setAllZoneValuesFromMean(zonesCount));

  const appBottom = createReflowGraph(graphRootBottom, {
    series: seriesBottom.map(p => ({ ...p })),
    zoneCount: zonesCount,
    istGraph: seriesBottomIst,
    startTime: 0,
    totalTime,
    maxTemp,
    name: bottomName,
  });
  appBottom.dispatch(AC.setAllZoneValuesFromMean(zonesCount));

  function makeBroadcastDispatch(...apps) {
    return (action) => { apps.forEach(a => a.dispatch(action)); };
  }
  // const dispatchBoth = makeBroadcastDispatch(appTop, appBottom);
  const dispatchBoth = makeBroadcastDispatch(appTop, appBottom);

  const controls = mountControls(dispatchBoth);

  appBottom.subscribe(controls.syncLabels);
  controls.syncLabels(appTop.getState());


}