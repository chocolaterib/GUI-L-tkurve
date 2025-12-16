import { EV } from './events.js';
import { computeEqualZones } from './zones.js';




export function reducer(state, ev) 
{
    switch (ev.type) {
        case EV.UPDATE_VIEWPORT:
            return { ...state, viewport: { ...state.viewport, ...ev.vp } };
        case EV.INIT: {
                const totalTime = Math.max(0, Number(state.totalTime));
                const zonesCalculated = computeEqualZones(0, totalTime, state.zoneCount);
                return{...state, zones: zonesCalculated,}
            }
        default:
            return state;
  }
}
