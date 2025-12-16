// src/templates/TooltipTemplates.js

const formatTime = (ms) => {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function getZoneTooltipContent(zoneData) {
  const startStr = formatTime(zoneData.xStart);
  const endStr = formatTime(zoneData.xEnd);
  const durationMin = Math.round(zoneData.duration / 1000 / 60);

  return `
    <div class="tooltip-header">
      <strong>Zone ${zoneData.index}</strong>
    </div>
    <div class="tooltip-body">
      
      <div class="tooltip-chart"></div>

      <div class="divider"></div>
    </div>
  `;
}