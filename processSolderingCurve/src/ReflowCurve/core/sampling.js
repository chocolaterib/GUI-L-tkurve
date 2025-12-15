import { initialState } from '../core/state.js';
// Placeholder: migrate your PCHIP, sampling, stats here as pure functions
export function pchipSlopes(points) {
    const n = points.length;
    if (n === 0) return [];
    if (n === 1) return [0];

    // Segmentlängen und Sekantensteigungen
    const h = new Array(n - 1), m = new Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
        h[i] = points[i + 1].x - points[i].x;
        if (!(h[i] > 0)) {
            // nicht streng wachsend -> sichere Variante: Nullsteigungen
            return Array(n).fill(0);
        }
        m[i] = (points[i + 1].y - points[i].y) / h[i];
    }

    const d = new Array(n);

    if (n === 2) {
        d[0] = m[0]; d[1] = m[0];
        return (initialState().maxRampRate != null) ? d.map(s => clampSlopes(s)) : d;
    }

    // Innenpunkte
    for (let i = 1; i < n - 1; i++) {
        if (m[i - 1] * m[i] <= 0) {
            d[i] = 0; // Vorzeichenwechsel -> Plateau
        } else {
            const w1 = 2 * h[i] + h[i - 1];
            const w2 = h[i] + 2 * h[i - 1];
            // gewichtetes harmonisches Mittel
            d[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]);
        }
    }

    // Rand: gemäß Fritsch–Carlson
    d[0] = ((2 * h[0] + h[1]) * m[0] - h[0] * m[1]) / (h[0] + h[1]);
    if (Math.sign(d[0]) !== Math.sign(m[0])) d[0] = 0;
    else if (Math.sign(m[0]) !== Math.sign(m[1]) && Math.abs(d[0]) > 3 * Math.abs(m[0])) d[0] = 3 * m[0];

    const k = n - 2;
    d[n - 1] = ((2 * h[k] + h[k - 1]) * m[k] - h[k] * m[k - 1]) / (h[k] + h[k - 1]);
    if (Math.sign(d[n - 1]) !== Math.sign(m[k])) d[n - 1] = 0;
    else if (Math.sign(m[k]) !== Math.sign(m[k - 1]) && Math.abs(d[n - 1]) > 3 * Math.abs(m[k])) d[n - 1] = 3 * m[k];

    // Optional Ramp-Limit
    if (initialState().maxRampRate != null) {
        for (let i = 0; i < n; i++) d[i] = clampSlopes(d[i]);
    }

    return d;
}

export function samplePCHIP(points, xValues) {
    if (!Array.isArray(points) || points.length === 0) return xValues.map(() => NaN);
    const d = pchipSlopes(points);
    const out = new Array(xValues.length);

    for (let j = 0; j < xValues.length; j++) {
        const t = xValues[j];
        if (t <= points[0].x) { out[j] = points[0].y; continue; }
        if (t >= points[points.length - 1].x) { out[j] = points[points.length - 1].y; continue; }
        const i = findSegment(points, t);
        if (i < 0) { out[j] = NaN; continue; }
        out[j] = hermiteEval(points[i], points[i + 1], d[i], d[i + 1], t);
    }
    return out;
}


export function meanTempOverInterval(points, t0, t1) {
    if (!(t1 > t0)) return NaN;
    const N = 96; // genügend fein für glatte Hermite; mache es konfigurierbar, wenn nötig
    const dt = (t1 - t0) / N;
    let sum = 0;

    // Simpson-Regel: f0 + 4 f1 + 2 f2 + ... + 4 f_{N-1} + fN
    const xVals = [];
    for (let i = 0; i <= N; i++) xVals.push(t0 + dt * i);
    const yVals = samplePCHIP(points, xVals);

    for (let i = 0; i <= N; i++) {
        const w = (i === 0 || i === N) ? 1 : (i % 2 === 1 ? 4 : 2);
        sum += w * yVals[i];
    }
    const integral = (dt / 3) * sum; // ∫ T(t) dt von t0 bis t1
    return integral / (t1 - t0);     // Mittelwert
}

// Bequeme Hilfsfunktion: gleichmäßige xs über Domain erzeugen
export function linspace(minX, maxX, count) {
    if (count <= 1) return [minX];
    const step = (maxX - minX) / (count - 1);
    const xs = new Array(count);
    for (let i = 0; i < count; i++) xs[i] = minX + i * step;
    return xs;
}

export function meanYInInterval(series, t0, t1, opts = {}) {
    const { samples = 128, usePCHIP = true } = opts;
    if (!Array.isArray(series) || series.length === 0 || !(t1 > t0)) return NaN;

    const xs = linspace(t0, t1, Math.max(2, samples));
    let ys;

    if (usePCHIP && typeof samplePCHIP === 'function' && series.length >= 2) {
        const res = samplePCHIP(series, xs);
        ys = Array.isArray(res) && typeof res[0] === 'number' ? res : res.map(p => p.y);
    } else {
        ys = xs.map(x => linearInterpolate(series, x));
    }

    let sum = 0;
    for (let i = 0; i < ys.length; i++) sum += ys[i];
    return sum / ys.length;
}
export function clampFirstAndLastPoint(series)
{
    series[0].y = series[1].y-10;
    series[series.length - 1].y = series[series.length - 2].y -10;
    return series;
}

export function upsertPointSorted(series, x, y, eps = 1e-9) {
    const s = series.slice();
    // Stelle finden
    let i = 0;
    while (i < s.length && s[i].x < x - eps) i++;
    if (i < s.length && Math.abs(s[i].x - x) <= eps) {
        s[i] = { x, y };
    } else {
        s.splice(i, 0, { x, y });
    }
    return s;
}
// src/core/sampling.js  (anhängen)
export function fitGraphToMean(series, zone, target, {
    maxIter = 20, tol = 1e-3, samples = 128
} = {}) {
    const t0 = zone.tStart, t1 = zone.tEnd;
    if (!(t1 > t0) || !Array.isArray(series) || series.length === 0) return series;

    const xMid = 0.5 * (t0 + t1);

    // Startwerte/Bounds aus aktueller y-Range abschätzen
    const ys = series.map(p => p.y);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    let lo = yMin - 2 * Math.abs(yMax - yMin) - 1; // großzügige Klammer
    let hi = yMax + 2 * Math.abs(yMax - yMin) + 1;

    // Hilfsfunktion: setze y(xMid) und evaluiere Zonenmittel
    const evalWithMid = (yMid) => {
        const s2 = upsertPointSorted(series, xMid, yMid);
        const mean = meanYInInterval(s2, t0, t1, { samples });
        return { mean, s2 };
    };

    // Prüfe Monotonie grob (nicht streng garantiert, aber praktisch ausreichend)
    let { mean: mLo } = evalWithMid(lo);
    let { mean: mHi } = evalWithMid(hi);
    if (isNaN(mLo) || isNaN(mHi)) return series;

    // Falls Ziel außerhalb, clampen
    if (target <= mLo) return upsertPointSorted(series, xMid, lo);
    if (target >= mHi) return upsertPointSorted(series, xMid, hi);

    // Bisection
    let bestSeries = series, bestErr = Infinity;
    for (let k = 0; k < maxIter; k++) {
        const midY = 0.5 * (lo + hi);
        const { mean, s2 } = evalWithMid(midY);
        const err = Math.abs(mean - target);
        if (err < bestErr) { bestErr = err; bestSeries = s2; }
        if (err <= tol) return s2;
        if (mean < target) {
            lo = midY; mLo = mean;
        } else {
            hi = midY; mHi = mean;
        }
    }
    return bestSeries; // best effort
}

function clampSlopes(slope) {
    const limit = Math.abs(initialState().maxRampRate);
    const res = Math.min(limit, Math.abs(slope));

    return res * Math.sign(slope);
}

function findSegment(points, t) {
    const n = points.length;
    if (t < points[0].x || t > points[n - 1].x) return -1;
    // binäre Suche wäre besser; linear ist ok für kleine n:
    for (let i = 0; i < n - 1; i++) {
        if (t >= points[i].x && t <= points[i + 1].x) return i;
    }
    return -1;
}

function hermiteEval(a, b, da, db, t) {
    const dt = b.x - a.x;
    const u = (t - a.x) / dt;
    const u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1;
    const h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2;
    const h11 = u3 - u2;
    return h00 * a.y + h10 * dt * da + h01 * b.y + h11 * dt * db;
}

function linearInterpolate(series, x) {
    const pts = series.map(p => ({ x: p.x ?? p.t, y: p.y ?? p.temp }))
        .sort((a, b) => a.x - b.x);
    if (x <= pts[0].x) return pts[0].y;
    if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
    let i = 0;
    while (i < pts.length - 1 && !(x >= pts[i].x && x <= pts[i + 1].x)) i++;
    const a = pts[i], b = pts[i + 1];
    const t = (x - a.x) / (b.x - a.x);
    return a.y + t * (b.y - a.y);
}


