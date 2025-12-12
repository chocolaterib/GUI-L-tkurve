let d3ns;

if (window.d3) {
  d3ns = window.d3;                 // bereits global vorhanden
} else {
  try {
    d3ns = await import('/masks/vendor/d3lib/d3.v7.min.js');
  } catch {
    d3ns = await import('/heater/js/d3.v7.js');
  }
  // Wenn die lokalen Files UMD sind, bekommst du window.d3:
  d3ns = d3ns?.default ?? window.d3 ?? d3ns;
}

export function ensureD3() {
  // ab hier synchron, weil das Modul erst exportiert,
  // nachdem obiges await fertig ist
  return d3ns;
}
