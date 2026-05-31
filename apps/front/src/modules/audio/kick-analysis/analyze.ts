// Offline percussive-onset ("kick") analysis of a fully-decoded song.
//
// Pipeline (non-causal, runs once at load over the whole waveform):
//   resample to 22.05kHz mono -> STFT -> HPSS (median-filter percussive/
//   harmonic separation) -> spectral-flux onset function on the PERCUSSIVE
//   component -> adaptive peak-picking -> double-trigger merge -> loudness
//   gate -> per-hit "power" from low-band + broadband percussive energy.
//
// HPSS is the load-bearing idea: sustained tonal content (wobble bass, synths,
// vocals) are horizontal ridges in the spectrogram; percussive hits are
// vertical ridges. Median-filtering along time isolates harmonic, along
// frequency isolates percussive. Detecting onsets on the percussive component
// sidesteps the "wobble bass looks like a kick in the FFT" problem.
//
// This module is pure (no DOM/AudioContext) so it can run in a Web Worker.
// It is the TypeScript twin of scripts/analyze-kicks.mjs — keep them in sync;
// that script is the offline tuning/sonification harness.

export type KickEvent = {
  /** Time of the hit in milliseconds from the start of the audio buffer. */
  tMs: number;
  /**
   * Perceived impact of the hit in ~[0, 1.1]. Blend of low-band thump and
   * broadband transient against a FIXED dB window, so a dubstep drop reads
   * harder than a J-pop kick and a synth stab reads soft. Drives visual punch.
   */
  power: number;
};

// --- Analysis configuration (must match scripts/analyze-kicks.mjs) -----------
const SR = 22050;
const FFT_SIZE = 1024; // ~46ms window, ~21.5 Hz/bin
const HOP = 256; //        ~11.6ms frames
const N_BINS = FFT_SIZE / 2;

const HPSS_TIME_KERNEL = 17;
const HPSS_FREQ_KERNEL = 17;
const HPSS_MASK_POWER = 2;

const ODF_LOW_WEIGHT_HZ = 250;

const PEAK_PRE_MAX = 3;
const PEAK_POST_MAX = 3;
const PEAK_PRE_AVG = 12;
const PEAK_POST_AVG = 12;
const PEAK_DELTA = 0.09;
const PEAK_WAIT = 4;

const MERGE_MAX_GAP_MS = 90;
const MERGE_VALLEY_FRAC = 0.55;

const ENERGY_GATE_FRAC = 0.18;
const ENERGY_GATE_PCTL = 0.6;

const POWER_KICK_DB_FLOOR = 30;
const POWER_KICK_DB_CEIL = 50;
const POWER_FULL_DB_FLOOR = 59;
const POWER_FULL_DB_CEIL = 71;
const POWER_LOW_WEIGHT = 0.6;
const POWER_FULL_WEIGHT = 0.4;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// In-place radix-2 Cooley-Tukey FFT (re/im length n = 2^k).
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = (-2 * Math.PI) / len;
    const wlenCos = Math.cos(ang);
    const wlenSin = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wCos = 1;
      let wSin = 0;
      for (let k = 0; k < half; k++) {
        const xr = re[i + k];
        const xi = im[i + k];
        const yr = re[i + k + half];
        const yi = im[i + k + half];
        const tr = wCos * yr - wSin * yi;
        const ti = wCos * yi + wSin * yr;
        re[i + k] = xr + tr;
        im[i + k] = xi + ti;
        re[i + k + half] = xr - tr;
        im[i + k + half] = xi - ti;
        const nwc = wCos * wlenCos - wSin * wlenSin;
        wSin = wCos * wlenSin + wSin * wlenCos;
        wCos = nwc;
      }
    }
  }
}

function hannWindow(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}

/** Downmix interleaved-per-channel data to mono, then linear-resample to SR. */
export function toMono22k(channels: Float32Array[], srcRate: number): Float32Array {
  const nCh = channels.length;
  const srcLen = channels[0]?.length ?? 0;
  const mono = new Float32Array(srcLen);
  if (nCh === 1) {
    mono.set(channels[0]);
  } else {
    const inv = 1 / nCh;
    for (let i = 0; i < srcLen; i++) {
      let s = 0;
      for (let c = 0; c < nCh; c++) s += channels[c][i];
      mono[i] = s * inv;
    }
  }
  if (srcRate === SR) return mono;
  // Linear resample. Fine for onset/percussion analysis; the slight aliasing
  // is inaudible to the detector and not rendered.
  const ratio = srcRate / SR;
  const dstLen = Math.floor(srcLen / ratio);
  const out = new Float32Array(dstLen);
  for (let i = 0; i < dstLen; i++) {
    const sp = i * ratio;
    const i0 = Math.floor(sp);
    const frac = sp - i0;
    const a = mono[i0];
    const b = i0 + 1 < srcLen ? mono[i0 + 1] : a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

function spectrogram(samples: Float32Array): Float32Array[] {
  const win = hannWindow(FFT_SIZE);
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  const nFrames = Math.max(0, Math.floor((samples.length - FFT_SIZE) / HOP) + 1);
  const frames = new Array<Float32Array>(nFrames);
  for (let f = 0; f < nFrames; f++) {
    const start = f * HOP;
    for (let i = 0; i < FFT_SIZE; i++) {
      re[i] = samples[start + i] * win[i];
      im[i] = 0;
    }
    fft(re, im);
    const mag = new Float32Array(N_BINS);
    for (let b = 0; b < N_BINS; b++) mag[b] = Math.hypot(re[b], im[b]);
    frames[f] = mag;
  }
  return frames;
}

function bruteMedian(a: ArrayLike<number>, lo: number, hi: number, scratch: Float64Array): number {
  let len = 0;
  for (let i = lo; i <= hi; i++) scratch[len++] = a[i];
  for (let i = 1; i < len; i++) {
    const v = scratch[i];
    let j = i - 1;
    while (j >= 0 && scratch[j] > v) {
      scratch[j + 1] = scratch[j];
      j--;
    }
    scratch[j + 1] = v;
  }
  return scratch[len >> 1];
}

// Incremental sliding-window median of `a` (length n, radius r) into `o`.
// Interior windows differ by one element as they slide, so we maintain a
// sorted buffer with O(w) remove+insert per step. Output matches a brute
// per-position median (edges clamped, `len>>1` midpoint).
function runningMedian(
  a: ArrayLike<number>,
  n: number,
  r: number,
  o: Float64Array,
  buf: Float64Array,
  scratch: Float64Array,
): void {
  if (n === 0) return;
  const w = 2 * r + 1;
  const interiorEnd = n - 1 - r;
  for (let i = 0; i < Math.min(r, n); i++) o[i] = bruteMedian(a, Math.max(0, i - r), Math.min(n - 1, i + r), scratch);
  for (let i = Math.max(interiorEnd + 1, r); i < n; i++) o[i] = bruteMedian(a, Math.max(0, i - r), Math.min(n - 1, i + r), scratch);
  if (interiorEnd < r) return;

  for (let k = 0; k < w; k++) buf[k] = a[k];
  for (let i = 1; i < w; i++) {
    const v = buf[i];
    let j = i - 1;
    while (j >= 0 && buf[j] > v) {
      buf[j + 1] = buf[j];
      j--;
    }
    buf[j + 1] = v;
  }
  o[r] = buf[r];

  for (let i = r + 1; i <= interiorEnd; i++) {
    const xout = a[i - 1 - r];
    const xin = a[i + r];
    let lo = 0;
    let hi = w - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (buf[mid] < xout) lo = mid + 1;
      else hi = mid;
    }
    for (let k = lo; k < w - 1; k++) buf[k] = buf[k + 1];
    lo = 0;
    hi = w - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (buf[mid] < xin) lo = mid + 1;
      else hi = mid;
    }
    for (let k = w - 1; k > lo; k--) buf[k] = buf[k - 1];
    buf[lo] = xin;
    o[i] = buf[r];
  }
}

// HPSS via median filtering (Fitzgerald 2010). Returns the percussive-masked
// magnitude spectrogram.
function hpssPercussive(frames: Float32Array[]): Float32Array[] {
  const nFrames = frames.length;
  const tHalf = HPSS_TIME_KERNEL >> 1;
  const fHalf = HPSS_FREQ_KERNEL >> 1;
  const bufCap = Math.max(HPSS_TIME_KERNEL, HPSS_FREQ_KERNEL);
  const buf = new Float64Array(bufCap);
  const scratch = new Float64Array(bufCap);

  const H = new Array<Float32Array>(nFrames);
  for (let f = 0; f < nFrames; f++) H[f] = new Float32Array(N_BINS);
  const col = new Float64Array(nFrames);
  const colOut = new Float64Array(nFrames);
  for (let b = 0; b < N_BINS; b++) {
    for (let f = 0; f < nFrames; f++) col[f] = frames[f][b];
    runningMedian(col, nFrames, tHalf, colOut, buf, scratch);
    for (let f = 0; f < nFrames; f++) H[f][b] = colOut[f];
  }

  const P = new Array<Float32Array>(nFrames);
  const rowOut = new Float64Array(N_BINS);
  for (let f = 0; f < nFrames; f++) {
    const row = frames[f];
    const hrow = H[f];
    runningMedian(row, N_BINS, fHalf, rowOut, buf, scratch);
    const out = new Float32Array(N_BINS);
    for (let b = 0; b < N_BINS; b++) {
      const hp = Math.pow(hrow[b], HPSS_MASK_POWER);
      const pp = Math.pow(rowOut[b], HPSS_MASK_POWER);
      const mask = pp + hp > 0 ? pp / (pp + hp) : 0;
      out[b] = row[b] * mask;
    }
    P[f] = out;
  }
  return P;
}

function onsetFunction(spec: Float32Array[]): Float64Array {
  const nFrames = spec.length;
  const hzPerBin = SR / FFT_SIZE;
  const weight = new Float64Array(N_BINS);
  for (let b = 0; b < N_BINS; b++) {
    const hz = b * hzPerBin;
    weight[b] = hz < ODF_LOW_WEIGHT_HZ ? 1 + (1 - hz / ODF_LOW_WEIGHT_HZ) : 1;
  }
  const odf = new Float64Array(nFrames);
  const prev = new Float64Array(N_BINS);
  for (let f = 0; f < nFrames; f++) {
    const row = spec[f];
    let flux = 0;
    for (let b = 0; b < N_BINS; b++) {
      const c = Math.log1p(row[b]);
      const d = c - prev[b];
      if (d > 0) flux += d * weight[b];
      prev[b] = c;
    }
    odf[f] = flux;
  }
  return odf;
}

function normalizeOdf(odf: Float64Array): Float64Array {
  const sorted = Float64Array.from(odf).sort();
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 1;
  const out = new Float64Array(odf.length);
  for (let i = 0; i < odf.length; i++) out[i] = Math.min(1.5, odf[i] / p99);
  return out;
}

function smooth3(x: Float64Array): Float64Array {
  const n = x.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = i > 0 ? x[i - 1] : x[i];
    const b = x[i];
    const c = i + 1 < n ? x[i + 1] : x[i];
    out[i] = 0.25 * a + 0.5 * b + 0.25 * c;
  }
  return out;
}

function percEnergy(perc: Float32Array[]): Float64Array {
  const n = perc.length;
  const e = new Float64Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0;
    const row = perc[f];
    for (let b = 0; b < row.length; b++) s += row[b];
    e[f] = s;
  }
  return e;
}

function bandEnergyPerFrame(spec: Float32Array[], loHz: number, hiHz: number): Float64Array {
  const hzPerBin = SR / FFT_SIZE;
  const lo = Math.max(1, Math.floor(loHz / hzPerBin));
  const hi = Math.min(N_BINS - 1, Math.ceil(hiHz / hzPerBin));
  const n = spec.length;
  const e = new Float64Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0;
    const row = spec[f];
    for (let b = lo; b <= hi; b++) s += row[b];
    e[f] = s;
  }
  return e;
}

function pickPeaks(odf: Float64Array): number[] {
  const n = odf.length;
  const peaks: number[] = [];
  let lastPeak = -Infinity;
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + odf[i];
  const mean = (lo: number, hi: number) => {
    lo = Math.max(0, lo);
    hi = Math.min(n, hi);
    if (hi <= lo) return 0;
    return (prefix[hi] - prefix[lo]) / (hi - lo);
  };
  for (let i = 0; i < n; i++) {
    const v = odf[i];
    let isMax = true;
    for (let k = i - PEAK_PRE_MAX; k <= i + PEAK_POST_MAX; k++) {
      if (k < 0 || k >= n || k === i) continue;
      if (odf[k] > v) {
        isMax = false;
        break;
      }
    }
    if (!isMax) continue;
    if (v < mean(i - PEAK_PRE_AVG, i + PEAK_POST_AVG + 1) + PEAK_DELTA) continue;
    if (i - lastPeak < PEAK_WAIT) {
      if (peaks.length && odf[peaks[peaks.length - 1]] < v) {
        peaks[peaks.length - 1] = i;
        lastPeak = i;
      }
      continue;
    }
    peaks.push(i);
    lastPeak = i;
  }
  return peaks;
}

function mergeDoubles(peaks: number[], odf: Float64Array, frameMs: number): number[] {
  if (peaks.length < 2) return peaks;
  const maxGapFrames = MERGE_MAX_GAP_MS / frameMs;
  const out = [peaks[0]];
  for (let i = 1; i < peaks.length; i++) {
    const prev = out[out.length - 1];
    const cur = peaks[i];
    if (cur - prev <= maxGapFrames) {
      let valley = Infinity;
      for (let k = prev + 1; k < cur; k++) if (odf[k] < valley) valley = odf[k];
      const smaller = Math.min(odf[prev], odf[cur]);
      if (valley > MERGE_VALLEY_FRAC * smaller) {
        if (odf[cur] > odf[prev]) out[out.length - 1] = cur;
        continue;
      }
    }
    out.push(cur);
  }
  return out;
}

function gateByEnergy(peaks: number[], energy: Float64Array): number[] {
  if (peaks.length < 4) return peaks;
  const sorted = peaks.map((f) => energy[f]).sort((a, b) => a - b);
  const ref = sorted[Math.floor(sorted.length * ENERGY_GATE_PCTL)] || 0;
  const floor = ENERGY_GATE_FRAC * ref;
  return peaks.filter((f) => energy[f] >= floor);
}

const toDb = (x: number) => 20 * Math.log10(Math.max(x, 1e-9));
function localMax(arr: Float64Array, f: number, halfWin: number): number {
  let m = -Infinity;
  for (let k = f - halfWin; k <= f + halfWin; k++) {
    if (k < 0 || k >= arr.length) continue;
    if (arr[k] > m) m = arr[k];
  }
  return m;
}

function computePower(kickDb: number, fullDb: number): number {
  const kmap = clamp01((kickDb - POWER_KICK_DB_FLOOR) / (POWER_KICK_DB_CEIL - POWER_KICK_DB_FLOOR));
  const fmap = clamp01((fullDb - POWER_FULL_DB_FLOOR) / (POWER_FULL_DB_CEIL - POWER_FULL_DB_FLOOR));
  return POWER_LOW_WEIGHT * kmap + POWER_FULL_WEIGHT * fmap;
}

/** Analyze already-mono 22.05kHz samples into a kick timeline. */
export function analyzeMono22k(samples: Float32Array): KickEvent[] {
  const spec = spectrogram(samples);
  if (spec.length === 0) return [];
  const perc = hpssPercussive(spec);
  const odf = smooth3(normalizeOdf(onsetFunction(perc)));
  const energy = percEnergy(perc);
  const kickE = bandEnergyPerFrame(perc, 30, 120);
  const fullE = percEnergy(perc);

  let peaks = pickPeaks(odf);
  const frameMs = (HOP * 1000) / SR;
  peaks = mergeDoubles(peaks, odf, frameMs);
  peaks = gateByEnergy(peaks, energy);

  const winMs = (FFT_SIZE * 1000) / SR;
  return peaks.map((f) => {
    const y0 = f > 0 ? odf[f - 1] : odf[f];
    const y1 = odf[f];
    const y2 = f + 1 < odf.length ? odf[f + 1] : odf[f];
    const denom = y0 - 2 * y1 + y2;
    const frac = denom !== 0 ? (0.5 * (y0 - y2)) / denom : 0;
    const fPos = f + Math.max(-0.5, Math.min(0.5, frac));
    const power = computePower(toDb(localMax(kickE, f, 2)), toDb(localMax(fullE, f, 2)));
    return { tMs: fPos * frameMs + winMs / 2, power };
  });
}

/** Full entry point: raw channel data at any sample rate -> kick timeline. */
export function analyzeKicks(channels: Float32Array[], srcRate: number): KickEvent[] {
  if (channels.length === 0 || (channels[0]?.length ?? 0) === 0) return [];
  return analyzeMono22k(toMono22k(channels, srcRate));
}
