export const EV = {
  TOGGLE_STATIC_DYNAMIC: 'TOGGLE_STATIC_DYNAMIC',
  SET_ZONES: 'SET_ZONES',
  UPDATE_VIEWPORT: 'UPDATE_VIEWPORT',
  SET_SERIES: 'SET_SERIES',
  SET_POINT: 'SET_POINT', // { index, x, y }
  SET_TOTAL_TIME: 'SET_TOTAL_TIME',     // { totalTime }
  SET_ZONE_COUNT: 'SET_ZONE_COUNT',     // { n }
  SET_ZONE_VALUE: 'SET_ZONE_VALUE', // { index, value }  -> Zonen-Solltemp
  SET_ALL_ZONE_VALUES_FROM_MEAN: 'SET_ALL_ZONE_VALUES_FROM_MEAN',
  SET_MAX_TEMP: 'SET_MAX_TEMP',
  INIT: 'INIT',
};

export const AC = {
  toggleStaticDynamic: (enableStatic) => ({ type: EV.TOGGLE_STATIC_DYNAMIC, enableStatic }),
  setZones: (zones) => ({ type: EV.SET_ZONES, zones }),
  updateViewport: (vp) => ({ type: EV.UPDATE_VIEWPORT, vp }),
  setSeries: (series) => ({ type: EV.SET_SERIES, series }),
  setPoint: (index, x, y) => ({ type: EV.SET_POINT, index, x, y }),
  setTotalTime: (totalTime) => ({ type: EV.SET_TOTAL_TIME, totalTime }),
  setZoneCount: (n) => ({ type: EV.SET_ZONE_COUNT, n }),
  setZoneValue: (index, value) => ({ type: EV.SET_ZONE_VALUE, index, value }),
  setAllZoneValuesFromMean: (n) => ({ type: EV.SET_ALL_ZONE_VALUES_FROM_MEAN, n }),
  setmaxTemp: (maxTemp) => ({ type: EV.SET_MAX_TEMP, maxTemp }),
  init:()=> ({ type: EV.INIT}),
};
