import { createReflowGraph } from './ReflowCurve/app/ReflowGraph.js';
import { createStepSeries, generateRandomStepLevels, generateSegmentedIst} from './utils/simulationData.js'

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

  // ---------- CONTAINER SETUP ----------
  // Multi-View Container (wird in renderMultiView eingehängt)
  const multiViewContainer = document.createElement('div');
  multiViewContainer.id = 'multi-view-container';
  // Styles sind jetzt im CSS definiert (#multi-view-container)

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
      appRoot.classList.add('visible-flex'); // Klasse statt style.display
      appRoot.style.display = 'flex'; // Fallback falls Klasse fehlt, oder besser in CSS steuern
      zoneDetailView.style.display = 'none';
      
      appRoot.innerHTML = '';
      
      // Toolbar/Controls Placeholder
      const toolbar = document.createElement('div');
      toolbar.className = 'toolbar-spacer'; // CSS Klasse statt inline style
      appRoot.appendChild(toolbar);
      
      appRoot.appendChild(multiViewContainer);
      multiViewContainer.innerHTML = '';
      
      renderMultiView();
      
    } else {
      // --> EINZELNE ZONE
      appRoot.style.display = 'none';
      zoneDetailView.style.display = 'flex'; // Layout per CSS Klasse empfohlen, hier beibehalten für Toggle-Logik
      
      zoneGraphOber.innerHTML = '';
      zoneGraphUnter.innerHTML = '';
      
      renderSingleZoneView(targetZoneIndex);
      updateZonePlist(targetZoneIndex); // Funktion muss existieren oder importiert sein (war im Original evtl. implizit?)
      
      const zoneNumber = targetZoneIndex + 1;
      if(currentZoneName) currentZoneName.textContent = zoneNumber;
      if(currentZoneName2) currentZoneName2.textContent = zoneNumber;
    }
  }

  // 1. ANSICHT: ALLE ZONEN (Scrollbar Historie)
  function renderMultiView() {
    const numberOfColumns = 4; // 1 Aktuell + 3 Historie
    
    for (let i = 0; i < numberOfColumns; i++) {
      const isHistory = i > 0;
      
      const columnWrapper = document.createElement('div');
      columnWrapper.className = 'mv-column'; // Styles aus CSS
      if (isHistory) columnWrapper.classList.add('history');

      multiViewContainer.appendChild(columnWrapper);

      const graphRootTop = document.createElement('div');
      graphRootTop.className = 'graph-root';

      const graphRootBottom = document.createElement('div');
      graphRootBottom.className = 'graph-root';

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
      const seriesTop = createStepSeries(levelsTop,0,zoneDuration);
      const seriesBottom = createStepSeries(levelsBottom,0,zoneDuration);
      const istDataTop = generateSegmentedIst(levelsTop, coverage, 0,zoneDuration);
      const istDataBottom = generateSegmentedIst(levelsBottom, coverage,0,zoneDuration);

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
    const WARNING_THRESHOLD = 10;
    const ERROR_THRESHOLD = 20;

    // 1. Layout Reset & Konfiguration für Scroll-Ansicht
    container.innerHTML = '';
    // Aktiviert den "Horizontal Scroll Mode" via CSS Klasse, überschreibt das Standard-Grid
    container.className = 'single-zone-scroll-view'; 
    
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

        const seriesTop = createStepSeries(singleLevelTop, 0, zoneDuration); 
        const seriesBottom = createStepSeries(singleLevelBottom, 0, zoneDuration);
        
        const istDataTop = generateSegmentedIst(singleLevelTop, coverage, 0, zoneDuration);
        const istDataBottom = generateSegmentedIst(singleLevelBottom, coverage, 0, zoneDuration);

        // --- UI RENDERING ---
        const colWrapper = document.createElement('div');
        colWrapper.className = 'sv-column';
        if (isHistory) colWrapper.classList.add('history');
        
        // Header
        const header = document.createElement('div');
        header.className = 'sv-header';
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = isHistory ? `Historie -${i} (Zone ${zoneNumber})` : `Aktuell (Zone ${zoneNumber})`;

        header.appendChild(titleSpan);
        colWrapper.appendChild(header);

        // Graphen-Container
        const divTop = document.createElement('div');
        divTop.className = 'graph-root top';

        const divBot = document.createElement('div');
        divBot.className = 'graph-root bottom';

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

  // ---------- DROPDOWN ----------
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
  
  // Dummy Funktion falls updateZonePlist nicht importiert wurde (im Original Code nicht sichtbar im Upload)
  // Falls sie existiert, diese Definition entfernen.
  function updateZonePlist(idx) {
      if(zonePlist) zonePlist.innerHTML = ''; // Placeholder
  }

  // Start
  setupZoneDropdown();
  renderGraphs(-1);
}