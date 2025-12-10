// src/view/Overlays.js
import { renderLineSeries } from './SollLineSeries.js';
import { renderIstLine } from './IstLine.js';
import { renderZoneGrid } from './ZoneGrid.js';
import { getZoneTooltipContent } from './TooltipTemplates.js';

export function renderAll(state, ctx, dispatch) {
renderZoneGrid(state, ctx, {
  onZoneClick: (zone) => {
    console.log("Klick auf", zone);
  },
  renderTooltip: (zoneData) => getZoneTooltipContent(zoneData)
});
renderLineSeries(state,ctx);
renderIstLine(state,ctx);

}
