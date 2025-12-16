// src/ui/Controls.js
import { AC } from '../ReflowCurve/core/events.js';

export function mountControls(dispatch) {
  const midBtn  = document.getElementById('midpointToggle');
  const zoneInput   = document.getElementById('zoneCount');
  const totalInput  = document.getElementById('totalTime');
  const maxTempInput  = document.getElementById('maxTemp');

  const syncLabels = (state) => {
    if (zoneInput && document.activeElement !== zoneInput) zoneInput.value = state.zoneCount;
    if (totalInput && document.activeElement !== totalInput && state.totalTime != null) {
      totalInput.value = state.totalTime;
    }
    if (maxTempInput && document.activeElement !== maxTempInput && state.maxTemperature != null) {
      maxTempInput.value = state.maxTemperature;
    }
  };

  midBtn?.addEventListener('change', (e) => dispatch(AC.toggleStaticDynamic(e.target.checked)));
  zoneInput?.addEventListener('change', (e) => dispatch(AC.setZoneCount(Number(e.target.value))));
  totalInput?.addEventListener('change', (e) => dispatch(AC.setTotalTime(Number(e.target.value))));
  maxTempInput?.addEventListener('change', (e) => dispatch(AC.setmaxTemp(Number(e.target.value))));
  return { syncLabels };
}
