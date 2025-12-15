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

  // 2. ANSICHT: EINZELNE ZONE (Detail Zoom)
  function renderSingleZoneView(zoneIndex) {
    const zoneNumber = zoneIndex + 1;
    
    // Daten für DIESE Zone holen
    const levelTop = levelsTopDefault[zoneIndex];
    const levelBottom = levelsBottomDefault[zoneIndex];
    
    // TRICK: Wir normieren die Zeit auf 0.
    // D.h. der Graph beginnt bei 0 und endet bei zoneDuration.
    // Dadurch wird nur diese Zone angezeigt.
    
    // Ein Array mit nur einem Eintrag (der aktuellen Zone)
    const singleLevelTop = [levelTop];
    const singleLevelBottom = [levelBottom];

    // Erstelle Serie startend bei 0
    const seriesTop = createStepSeries(singleLevelTop, 0); 
    const seriesBottom = createStepSeries(singleLevelBottom, 0);
    
    // Ist-Daten startend bei 0
    const istDataTop = generateSegmentedIst(singleLevelTop, 0.5, 0);
    const istDataBottom = generateSegmentedIst(singleLevelBottom, 0.5, 0);

    // Zonen-Hintergrund für eine einzelne Zone (Start 0)
    const singleZoneDef = [{
        id: zoneNumber,
        tStart: 0,
        tEnd: zoneDuration,
        meanValue: null
    }];

    const commonOptions = {
        zoneCount: 1, // Wir zeigen effektiv nur 1 Zone an
        isHistory: false,
        totalTime: zoneDuration, // Gesamzeit ist nur die Dauer dieser Zone!
        maxTemp: maxTemp,
        zones: singleZoneDef
    };

    // Oberhitze
    const appOber = createReflowGraph(zoneGraphOber, {
        ...commonOptions,
        series: seriesTop,
        istGraph: istDataTop,
        name: `Oberhitze Zone ${zoneNumber}`,
    });

    // Unterhitze
    const appUnter = createReflowGraph(zoneGraphUnter, {
        ...commonOptions,
        series: seriesBottom,
        istGraph: istDataBottom,
        name: `Unterhitze Zone ${zoneNumber}`,
    });
    
    allApps.push(appOber, appUnter);
  }

  // Liste aktualisieren
  function updateZonePlist(zoneIndex) {
    const zoneNumber = zoneIndex + 1;
    const tStart = zoneIndex * zoneDuration;
    const tEnd = (zoneIndex + 1) * zoneDuration;
    const levelTop = levelsTopDefault[zoneIndex];
    const levelBottom = levelsBottomDefault[zoneIndex];
    
    let html = `
        <table style="width:100%; text-align:left; border-collapse: collapse;">
            <thead>
                <tr style="border-bottom:1px solid #eee;">
                    <th style="padding:4px;">Parameter</th>
                    <th style="padding:4px;">Wert</th>
                </tr>
            </thead>
            <tbody>
                <tr><td style="padding:4px;">Zone Nr.</td><td><b>${zoneNumber}</b></td></tr>
                <tr><td style="padding:4px;">Startzeit (Global)</td><td>${tStart.toFixed(1)} s</td></tr>
                <tr><td style="padding:4px;">Endzeit (Global)</td><td>${tEnd.toFixed(1)} s</td></tr>
                <tr><td style="padding:4px;">Dauer</td><td>${zoneDuration.toFixed(1)} s</td></tr>
                <tr><td style="padding:4px;">Soll Oberhitze</td><td>${levelTop} °C</td></tr>
                <tr><td style="padding:4px;">Soll Unterhitze</td><td>${levelBottom} °C</td></tr>
            </tbody>
        </table>
        <h4 style="margin-top:16px; margin-bottom:8px;">Historie (Simuliert)</h4>
        <div style="font-size:12px; color:#666;">
    `;
    
    // Simuliere Ist-Werte Tabelle
    const istDataTop = generateSegmentedIst([levelTop], 0.5, tStart); // Hier absolute Zeit für Anzeige
    const istDataBottom = generateSegmentedIst([levelBottom], 0.5, tStart);
    
    const pointsT = istDataTop[0] || [];
    const pointsB = istDataBottom[0] || [];
    
    pointsT.forEach((pt, i) => {
        const pb = pointsB[i];
        html += `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #f5f5f5; padding:2px 0;">
            <span>t=${pt.x.toFixed(1)}s</span>
            <span>Top: ${pt.y.toFixed(0)}°</span>
            <span>Bot: ${pb ? pb.y.toFixed(0) : '-'}°</span>
        </div>`;
    });
    
    html += '</div>';
    zonePlist.innerHTML = html;
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