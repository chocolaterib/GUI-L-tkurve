import { createReflowGraph } from './ReflowCurve/app/ReflowGraph.js';
import { AC } from './ReflowCurve/core/events.js';
import { mountControls } from './ui/Controls.js';

export function initReflowGraph(options = {}) {
  const appRoot = document.getElementById('app');
  const zoneDetailView = document.getElementById('zoneDetailView');
  const zoneGraphOber = document.getElementById('zoneGraphOber');
  const zoneGraphUnter = document.getElementById('zoneGraphUnter');
  const currentZoneName = document.getElementById('currentZoneName');
  const currentZoneName2 = document.getElementById('currentZoneName2');
  const zonePlist = document.getElementById('zonePlist');

  // ---------- KONFIGURATION ----------
  const totalTime = 300;
  const maxTemp = 300;
  const zonesCount = 12; 
  const zoneDuration = totalTime / zonesCount;

  // Globale Referenzen
  let allApps = [];
  let currentZoneIndex = -1; // -1 = Alle Zonen

  // Feste Profile für "Aktuell"
  const levelsTopDefault = [50, 100, 130, 150, 160, 170, 180, 200, 230, 245, 150, 100];
  const levelsBottomDefault = [40, 90, 120, 140, 150, 160, 170, 190, 220, 230, 140, 90];

  // 1. Zonen Definition (Global)
  const precalculatedZones = [];
  for(let z=0; z<zonesCount; z++) {
      precalculatedZones.push({ 
        id: z + 1, 
        tStart: z * zoneDuration, 
        tEnd: (z + 1) * zoneDuration, 
        meanValue: null 
      });
  }

  // Helper: Treppen-Graph
  function createStepSeries(levels, startTimeOffset = 0) {
    const points = [];
    levels.forEach((lvl, index) => {
      // Wir addieren den Offset (für globale Sicht ist Offset 0)
      const tStart = (index * zoneDuration) + startTimeOffset;
      const tEnd = ((index + 1) * zoneDuration) + startTimeOffset;
      points.push({ x: tStart, y: lvl });
      points.push({ x: tEnd, y: lvl });
    });
    return points;
  }

  // Helper: Ist-Graph (Segmente)
  function generateSegmentedIst(levels, coverage = 1.0, startTimeOffset = 0) {
    const allSegments = [];
    levels.forEach((lvl, index) => {
      const segmentPoints = [];
      const tStart = (index * zoneDuration) + startTimeOffset;
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

  function generateRandomStepLevels(count) {
    return Array.from({ length: count }, () => Math.floor(Math.random() * (240 - 100) + 100));
  }

  // ---------- CONTAINER SETUP ----------
  // Multi-View Container (wird in renderMultiView eingehängt)
  const multiViewContainer = document.createElement('div');
  multiViewContainer.id = 'multi-view-container';
  // Styling ist nun größtenteils im CSS (#multi-view-container), hier nur Basics:
  multiViewContainer.style.display = 'flex';
  multiViewContainer.style.flexDirection = 'row';
  multiViewContainer.style.scrollSnapType = 'x mandatory';
  multiViewContainer.style.scrollBehavior = 'smooth';

  multiViewContainer.addEventListener('wheel', (evt) => {
    if (evt.deltaY !== 0) {
      evt.preventDefault();
      multiViewContainer.scrollLeft += evt.deltaY;
    }
  }, { passive: false });


  // ---------- RENDER LOGIK ----------
  
  function renderGraphs(targetZoneIndex = -1) {
    allApps = [];
    
    // UI Umschaltung
    if (targetZoneIndex === -1) {
      // --> ALLE ZONEN
      appRoot.style.display = 'flex'; // Wichtig: Flex damit der Container füllt
      zoneDetailView.style.display = 'none';
      
      appRoot.innerHTML = '';
      // Toolbar/Controls Placeholder (optional)
      const toolbar = document.createElement('div');
      toolbar.style.padding = '8px 16px';
      appRoot.appendChild(toolbar);
      
      appRoot.appendChild(multiViewContainer);
      multiViewContainer.innerHTML = '';
      
      renderMultiView();
      
    } else {
      // --> EINZELNE ZONE
      appRoot.style.display = 'none';
      zoneDetailView.style.display = 'flex'; // Wichtig: Flex für Layout
      
      zoneGraphOber.innerHTML = '';
      zoneGraphUnter.innerHTML = '';
      
      renderSingleZoneView(targetZoneIndex);
      updateZonePlist(targetZoneIndex);
      
      const zoneNumber = targetZoneIndex + 1;
      currentZoneName.textContent = zoneNumber;
      currentZoneName2.textContent = zoneNumber;
    }

    // Controls neu initialisieren (optional, falls benötigt)
    // setupControls(); 
  }

  // 1. ANSICHT: ALLE ZONEN (Scrollbar Historie)
  function renderMultiView() {
    const numberOfColumns = 4; // 1 Aktuell + 3 Historie
    
    for (let i = 0; i < numberOfColumns; i++) {
      const isHistory = i > 0;
      
      const columnWrapper = document.createElement('div');
      columnWrapper.style.display = 'grid';
      columnWrapper.style.gridTemplateRows = '1fr 1fr'; // Beide Graphen gleich hoch
      columnWrapper.style.minWidth = '100%'; // Volle Breite pro Spalte
      columnWrapper.style.flex = '0 0 100%'; // Kein Schrumpfen -> Scrollbar erzwingen
      columnWrapper.style.height = '100%';
      columnWrapper.style.padding = '0 16px 16px 16px';
      columnWrapper.style.boxSizing = 'border-box';
      columnWrapper.style.scrollSnapAlign = 'start';
      if (isHistory) columnWrapper.style.backgroundColor = '#f9fafb';

      multiViewContainer.appendChild(columnWrapper);

      const graphRootTop = document.createElement('div');
      graphRootTop.style.position = 'relative'; 
      graphRootTop.style.minHeight = '0'; // Flex-Fix

      const graphRootBottom = document.createElement('div');
      graphRootBottom.style.position = 'relative';
      graphRootBottom.style.minHeight = '0';

      columnWrapper.appendChild(graphRootTop);
      columnWrapper.appendChild(graphRootBottom);

      const suffix = isHistory ? ` (Historie -${i})` : " (Aktuell)";

      let levelsTop, levelsBottom, coverage;
      if (isHistory) {
        levelsTop = generateRandomStepLevels(zonesCount);
        levelsBottom = generateRandomStepLevels(zonesCount);
        coverage = 1.0; 
      } else {
        levelsTop = levelsTopDefault;
        levelsBottom = levelsBottomDefault;
        coverage = 0.5;
      }

      // Globale Zeit (0 bis 300s)
      const seriesTop = createStepSeries(levelsTop);
      const seriesBottom = createStepSeries(levelsBottom);
      const istDataTop = generateSegmentedIst(levelsTop, coverage);
      const istDataBottom = generateSegmentedIst(levelsBottom, coverage);

      const commonOptions = {
        zoneCount: zonesCount,
        isHistory: isHistory,
        totalTime: totalTime,
        maxTemp: maxTemp,
        zones: JSON.parse(JSON.stringify(precalculatedZones)),
      };

      const appTop = createReflowGraph(graphRootTop, {
        ...commonOptions,
        series: seriesTop,
        istGraph: istDataTop,
        name: `Oberhitze${suffix}`,
      });

      const appBottom = createReflowGraph(graphRootBottom, {
        ...commonOptions,
        series: seriesBottom,
        istGraph: istDataBottom,
        name: `Unterhitze${suffix}`,
      });

      allApps.push(appTop, appBottom);
    }
  }

// 2. ANSICHT: EINZELNE ZONE (Mit erzwungenen Warnungen/Fehlern für Demo)
  function renderSingleZoneView(zoneIndex) {
    const zoneNumber = zoneIndex + 1;
    const container = document.getElementById('zoneGraphsContainer');
    
    // Ampel-Konfiguration
    const WARNING_THRESHOLD = 10; // Gelb ab 10°C
    const ERROR_THRESHOLD = 20;   // Rot ab 20°C

    // 1. Layout Reset
    container.innerHTML = ''; 
    container.style.display = 'flex';
    container.style.flexDirection = 'row';
    container.style.height = 'auto'; 
    container.style.flex = '1';      
    container.style.minHeight = '0'; 
    container.style.overflowX = 'auto';
    container.style.overflowY = 'hidden';
    container.style.scrollSnapType = 'x mandatory';
    container.style.scrollBehavior = 'smooth';
    
    container.onwheel = (evt) => {
        if (evt.deltaY !== 0) {
            evt.preventDefault();
            container.scrollLeft += evt.deltaY;
        }
    };

    const numberOfColumns = 4; 

    for (let i = 0; i < numberOfColumns; i++) {
        const isHistory = i > 0;
        
        // --- DATEN ERZEUGUNG ---
        let levelTop, levelBottom, coverage;
        
        if (isHistory) {
            levelTop = Math.floor(Math.random() * (240 - 100) + 100);
            levelBottom = Math.floor(Math.random() * (240 - 100) + 100);
            coverage = 1.0;
        } else {
            levelTop = levelsTopDefault[zoneIndex];
            levelBottom = levelsBottomDefault[zoneIndex];
            coverage = 0.5; 
        }

        const singleLevelTop = [levelTop];
        const singleLevelBottom = [levelBottom];

        const seriesTop = createStepSeries(singleLevelTop, 0); 
        const seriesBottom = createStepSeries(singleLevelBottom, 0);
        
        const istDataTop = generateSegmentedIst(singleLevelTop, coverage, 0);
        const istDataBottom = generateSegmentedIst(singleLevelBottom, coverage, 0);

        // --- DEMO-MANIPULATION (HIER WERDEN FEHLER ERZWUNGEN) ---
        if (i === 1) {
            // Historie 1: Wir addieren künstlich 15°C zur Oberhitze -> WARNUNG (GELB)
            istDataTop.forEach(p => p.y += 15);
        } 
        else if (i === 2) {
            // Historie 2: Wir ziehen künstlich 25°C von der Unterhitze ab -> ERROR (ROT)
            istDataBottom.forEach(p => p.y -= 25);
        }
        // Spalte 0 (Aktuell) und 3 (Historie-3) bleiben normal (meistens Grün)

        // --- AMPEL LOGIK ---
        const getMaxDeviation = (istData, targetLevel) => {
            let maxDev = 0;
            if (!istData || istData.length === 0) return 0;
            for (const p of istData) {
                const diff = Math.abs(p.y - targetLevel);
                if (diff > maxDev) maxDev = diff;
            }
            return maxDev;
        };

        const maxDevTop = getMaxDeviation(istDataTop, levelTop);
        const maxDevBottom = getMaxDeviation(istDataBottom, levelBottom);
        const worstDev = Math.max(maxDevTop, maxDevBottom);

        let statusColor = '#10b981'; // Grün
        let statusText = 'OK';

        if (worstDev > ERROR_THRESHOLD) {
            statusColor = '#ef4444'; // Rot
            statusText = `Error (Abw. ${worstDev.toFixed(1)}°C)`;
        } else if (worstDev > WARNING_THRESHOLD) {
            statusColor = '#f59e0b'; // Gelb
            statusText = `Warnung (Abw. ${worstDev.toFixed(1)}°C)`;
        }

        // --- UI RENDERING ---
        const colWrapper = document.createElement('div');
        colWrapper.style.display = 'flex';
        colWrapper.style.flexDirection = 'column';
        colWrapper.style.flex = '0 0 100%';       
        colWrapper.style.minWidth = '100%';       
        colWrapper.style.height = '100%'; 
        colWrapper.style.scrollSnapAlign = 'start';
        colWrapper.style.borderRight = '1px solid #e5e7eb';
        colWrapper.style.backgroundColor = isHistory ? '#f9fafb' : '#fff';
        colWrapper.style.boxSizing = 'border-box';
        
        // Header
        const header = document.createElement('div');
        header.style.padding = '12px 16px';
        header.style.fontSize = '14px';
        header.style.fontWeight = 'bold';
        header.style.borderBottom = '1px solid #eee';
        header.style.color = '#333';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between'; 
        header.style.alignItems = 'center';
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = isHistory ? `Historie -${i} (Zone ${zoneNumber})` : `Aktuell (Zone ${zoneNumber})`;
        
        const statusContainer = document.createElement('div');
        statusContainer.style.display = 'flex';
        statusContainer.style.alignItems = 'center';
        statusContainer.style.gap = '8px';

        const indicator = document.createElement('div');
        indicator.style.width = '16px';
        indicator.style.height = '16px';
        indicator.style.borderRadius = '50%';
        indicator.style.backgroundColor = statusColor;
        indicator.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.8), 0 0 4px rgba(0,0,0,0.1)';
        indicator.title = statusText; 

        const statusLabel = document.createElement('span');
        statusLabel.style.fontSize = '12px';
        statusLabel.style.fontWeight = 'normal';
        statusLabel.style.color = '#666';
        statusLabel.textContent = worstDev > 0 ? `±${worstDev.toFixed(1)}°` : '';

        statusContainer.appendChild(statusLabel);
        statusContainer.appendChild(indicator);
        header.appendChild(titleSpan);
        header.appendChild(statusContainer);
        colWrapper.appendChild(header);

        // Graphen-Container
        const divTop = document.createElement('div');
        divTop.style.flex = '1'; 
        divTop.style.position = 'relative';
        divTop.style.minHeight = '0'; 

        const divBot = document.createElement('div');
        divBot.style.flex = '1';
        divBot.style.position = 'relative';
        divBot.style.minHeight = '0';
        divBot.style.borderTop = '1px solid #eee'; 

        colWrapper.appendChild(divTop);
        colWrapper.appendChild(divBot);
        container.appendChild(colWrapper);

        const singleZoneDef = [{
            id: zoneNumber,
            tStart: 0,
            tEnd: zoneDuration,
            meanValue: null
        }];

        const commonOptions = {
            zoneCount: 1, 
            isHistory: isHistory,
            totalTime: zoneDuration, 
            maxTemp: maxTemp,
            zones: singleZoneDef
        };

        const appOber = createReflowGraph(divTop, {
            ...commonOptions,
            series: seriesTop,
            istGraph: istDataTop,
            name: `Oberhitze`, 
        });

        const appUnter = createReflowGraph(divBot, {
            ...commonOptions,
            series: seriesBottom,
            istGraph: istDataBottom,
            name: `Unterhitze`,
        });
        
        allApps.push(appOber, appUnter);
    }
  }
  // ---------- DROPDOWN (Unverändert wichtig) ----------
  function setupZoneDropdown() {
    const btn = document.getElementById('selectZoneButton');
    const dropdown = document.getElementById('zoneSelectionDropdown');

    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation(); 
      dropdown.classList.toggle('show');
    });

    window.addEventListener('click', () => {
      dropdown.classList.remove('show');
    });

    dropdown.innerHTML = '';
    
    // "Alle Zonen" Option
    const itemAll = document.createElement('button');
    itemAll.className = 'zone-dropdown-item active'; 
    itemAll.innerText = 'Alle Zonen (Gesamtübersicht)';
    itemAll.onclick = () => {
      dropdown.classList.remove('show');
      selectZone(-1, itemAll);
    };
    dropdown.appendChild(itemAll);

    // Einzelne Zonen
    for (let i = 0; i < zonesCount; i++) {
      const item = document.createElement('button');
      item.className = 'zone-dropdown-item';
      item.innerText = `Zone ${i + 1}`;
      item.onclick = () => {
        dropdown.classList.remove('show');
        selectZone(i, item);
      };
      dropdown.appendChild(item);
    }

    function selectZone(index, clickedBtn) {
      currentZoneIndex = index;
      if (index === -1) btn.innerText = "Alle Zonen";
      else btn.innerText = `Zone ${index + 1}`;

      const allItems = dropdown.querySelectorAll('.zone-dropdown-item');
      allItems.forEach(el => el.classList.remove('active'));
      clickedBtn.classList.add('active');

      renderGraphs(index);
    }
  }

  // Start
  setupZoneDropdown();
  renderGraphs(-1);
}