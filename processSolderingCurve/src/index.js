import { createReflowGraph } from './ReflowCurve/app/ReflowGraph.js';
import { AC } from './ReflowCurve/core/events.js';
import { mountControls } from './ui/Controls.js';

export function initReflowGraph(options = {}) {
  const appRoot = document.getElementById('app');

  // ---------- STYLING ----------
  const customScrollbarStyle = document.createElement('style');
  customScrollbarStyle.innerHTML = `
    #multi-view-container::-webkit-scrollbar {
      width: 12px;
      height: 12px;
      background-color: #f5f5f5;
    }
    #multi-view-container::-webkit-scrollbar-track {
      -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
      border-radius: 10px;
      background-color: #f5f5f5;
    }
    #multi-view-container::-webkit-scrollbar-thumb {
      border-radius: 10px;
      background-color: #888;
      box-shadow: inset 0 0 6px rgba(0,0,0,0.3);
    }
    #multi-view-container::-webkit-scrollbar-thumb:hover {
      background-color: #555;
    }
  `;
  document.head.appendChild(customScrollbarStyle);

  // ---------- Toolbar ----------
  const toolbar = document.createElement('div');
  toolbar.style.display = 'flex';
  toolbar.style.gap = '8px';
  toolbar.style.margin = '8px 0';
  toolbar.style.padding = '0 16px';
  appRoot.appendChild(toolbar);

  // ---------- Scroll Container ----------
  const multiViewContainer = document.createElement('div');
  multiViewContainer.id = 'multi-view-container';
  multiViewContainer.style.display = 'flex';
  multiViewContainer.style.flexDirection = 'row';
  multiViewContainer.style.width = '100%';
  multiViewContainer.style.height = 'calc(100vh - 60px)';
  multiViewContainer.style.overflowX = 'auto';
  multiViewContainer.style.overflowY = 'hidden';
  multiViewContainer.style.scrollSnapType = 'x mandatory';
  multiViewContainer.style.scrollBehavior = 'smooth';

  multiViewContainer.addEventListener('wheel', (evt) => {
    if (evt.deltaY !== 0) {
      evt.preventDefault();
      multiViewContainer.scrollLeft += evt.deltaY;
    }
  }, { passive: false });

  appRoot.appendChild(multiViewContainer);

  // ---------- Konfiguration ----------
  const totalTime = 300;
  const maxTemp = 300;
  const zonesCount = 12;
  const zoneDuration = totalTime / zonesCount;

  // 1. Zonen Definition
  const precalculatedZones = [];
  for(let z=0; z<zonesCount; z++) {
      precalculatedZones.push({ 
        id: z, 
        tStart: z * zoneDuration, 
        tEnd: (z + 1) * zoneDuration, 
        meanValue: null 
      });
  }

  // 2. Soll-Graph (Treppe)
  function createStepSeries(levels) {
    const points = [];
    levels.forEach((lvl, index) => {
      const tStart = index * zoneDuration;
      const tEnd = (index + 1) * zoneDuration;
      points.push({ x: tStart, y: lvl });
      points.push({ x: tEnd, y: lvl });
    });
    return points;
  }

  // 3. Ist-Graph (Segmente) - MIT COVERAGE PARAMETER
  // coverage: 1.0 = 100% der Zone (Historie), 0.5 = 50% der Zone (Aktuell)
  function generateSegmentedIst(levels, coverage = 1.0) {
    const allSegments = [];
    levels.forEach((lvl, index) => {
      const segmentPoints = [];
      const tStart = index * zoneDuration;
      
      // Berechnung des Endpunkts basierend auf 'coverage'
      // Aktuell: tStart + halbe Dauer
      // Historie: tStart + volle Dauer
      const actualEnd = tStart + (zoneDuration * coverage);

      for (let t = tStart; t <= actualEnd; t += 2) {
        const noise = (Math.random() - 0.5) * 8; 
        let val = lvl + noise;
        if (val < 0) val = 0;
        segmentPoints.push({ x: t, y: val });
      }
      allSegments.push(segmentPoints);
    });
    return allSegments;
  }

  // Profile (Zufall für Historie)
  function generateRandomStepLevels(count) {
    return Array.from({ length: count }, () => Math.floor(Math.random() * (240 - 100) + 100));
  }
  
  // Feste Profile für "Aktuell"
  const levelsTopDefault = [50, 100, 130, 150, 160, 170, 180, 200, 230, 245, 150, 100];
  const levelsBottomDefault = [40, 90, 120, 140, 150, 160, 170, 190, 220, 230, 140, 90];

  const allApps = [];
  const numberOfColumns = 4; 

  // ---------- Render Loop ----------
  for (let i = 0; i < numberOfColumns; i++) {
    const isHistory = i > 0;
    
    const columnWrapper = document.createElement('div');
    columnWrapper.style.display = 'grid';
    columnWrapper.style.gridTemplateRows = '0.9fr 0.9fr'; 
    columnWrapper.style.minWidth = '100%'; 
    columnWrapper.style.flex = '0 0 100%';
    columnWrapper.style.height = '100%';
    columnWrapper.style.padding = '0 16px 16px 16px';
    columnWrapper.style.boxSizing = 'border-box';
    columnWrapper.style.scrollSnapAlign = 'start';
    if (isHistory) columnWrapper.style.backgroundColor = '#f9fafb';

    multiViewContainer.appendChild(columnWrapper);

    const graphRootTop = document.createElement('div');
    graphRootTop.style.minHeight = '0';
    graphRootTop.style.position = 'relative';

    const graphRootBottom = document.createElement('div');
    graphRootBottom.style.minHeight = '0';
    graphRootBottom.style.position = 'relative';

    columnWrapper.appendChild(graphRootTop);
    columnWrapper.appendChild(graphRootBottom);

    const suffix = isHistory ? ` (Historie -${i})` : " (Aktuell)";

    // UNTERSCHEIDUNG: Datenquellen & Länge
    let levelsTop, levelsBottom;
    let coverage;

    if (isHistory) {
      // Historie: Zufällige Werte, Volle Länge (1.0)
      levelsTop = generateRandomStepLevels(zonesCount);
      levelsBottom = generateRandomStepLevels(zonesCount);
      coverage = 1.0; 
    } else {
      // Aktuell: Feste Standardwerte, Halbe Länge (0.5)
      levelsTop = levelsTopDefault;
      levelsBottom = levelsBottomDefault;
      coverage = 0.5;
    }

    const seriesTop = createStepSeries(levelsTop);
    const seriesBottom = createStepSeries(levelsBottom);
    
    // Hier übergeben wir den 'coverage' Parameter
    const istDataTop = generateSegmentedIst(levelsTop, coverage);
    const istDataBottom = generateSegmentedIst(levelsBottom, coverage);

    const appTop = createReflowGraph(graphRootTop, {
      series: seriesTop,
      zoneCount: zonesCount,
      istGraph: istDataTop,
      isHistory: isHistory,
      totalTime,
      maxTemp,
      zones: JSON.parse(JSON.stringify(precalculatedZones)),
      name: `Oberhitze${suffix}`,
    });

    const appBottom = createReflowGraph(graphRootBottom, {
      series: seriesBottom,
      zoneCount: zonesCount,
      istGraph: istDataBottom,
      isHistory: isHistory,
      totalTime,
      maxTemp,
      zones: JSON.parse(JSON.stringify(precalculatedZones)),
      name: `Unterhitze${suffix}`,
    });

    allApps.push(appTop, appBottom);
  }

  // Controls
  const controlsRow = document.createElement('div');
  controlsRow.style.display = 'flex';
  controlsRow.style.gap = '24px';
  controlsRow.style.marginTop = '8px';
  appRoot.appendChild(controlsRow);
  const controlsHost = document.createElement('div');
  controlsRow.appendChild(controlsHost);

  function makeBroadcastDispatch(appsList) {
    return (action) => { appsList.forEach(a => a.dispatch(action)); };
  }
  const dispatchAll = makeBroadcastDispatch(allApps);
  const controls = mountControls(dispatchAll);
  
  if(allApps.length > 0) {
      allApps[1].subscribe(controls.syncLabels);
      controls.syncLabels(allApps[0].getState());
  }
}