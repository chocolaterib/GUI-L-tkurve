import { initialState } from '../core/state.js';
import { reducer } from '../core/reducer.js';
import { buildScales } from '../core/layout.js';
import { ChartShell } from '../view/ChartShell.js';
import { renderAll } from '../view/Overlays.js';
import { AC } from '../core/events.js';

export function createReflowGraph(root, options) {
  let state = initialState(options);
  const shell = new ChartShell(root);
  reducer(state, AC.init());
  shell.onResize = (size) => {
    dispatch({ type: 'UPDATE_VIEWPORT', vp: { width: size.width, height: size.height } });
  };

  function dispatch(ev) {
    state = reducer(state, ev);
    state = { ...state, scales: buildScales(state) };
    shell.update(state);
    renderAll(state, shell.ctx, dispatch);
    notify(state);
  }

  const listeners = new Set();
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function notify(s) { for (const fn of listeners) fn(s); }

  // initial render with current container size
  const rect = root.getBoundingClientRect();
  dispatch({ type: 'UPDATE_VIEWPORT', vp: { width: rect.width || 800, height: rect.height || 420 } });

  return { dispatch, getState: () => state, subscribe };
}
