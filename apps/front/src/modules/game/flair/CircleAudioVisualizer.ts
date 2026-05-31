import type { Entity } from "../engine/Entity";
import type { TickContext } from "../engine/TickContext";
import type { KickEvent } from "../../audio/kick-analysis/analyze";

/**
 * Beat-reactive circular spectrum visualizer.
 *
 * Designed for hardcore / techno / jpop / dubstep: every percussive hit
 * should be visible, with the bass kick as the load-bearing event.
 *
 * Two independent signal paths:
 *
 *   - KICK PULSE (the load-bearing beat event): driven by a PRECOMPUTED kick
 *     timeline, not live FFT. The whole song is analyzed once at load with
 *     non-causal HPSS (harmonic/percussive separation) + onset detection (see
 *     modules/audio/kick-analysis), producing {tMs, power} events. At play
 *     time we poll the timeline against the song clock and fire each hit at
 *     its exact moment, with `power` scaling the punch — synth stabs pump soft,
 *     battery slams pump hard. This sidesteps the wobble-bass-looks-like-a-kick
 *     ambiguity that a real-time FFT detector can't resolve.
 *
 *   - SPECTRUM BARS (cosmetic): still driven by the live AnalyserNode FFT each
 *     frame, with per-bar spring physics + per-bar flux impulses so every
 *     percussive hit visibly punches rather than smoothly swelling.
 *
 * Render: translucent disk with N pie-slice cutouts to (radius - amp) so bars
 * are anchored to the inner edge of the ring and never extend beyond it.
 */

// --- Spectrum sampling (cosmetic bars) ---------------------------------------
const FFT_SIZE = 2048;
// 0 — the bar springs do their own smoothing, and a percussive transient is
// only ~10 ms wide; analyser smoothing would average it into surrounding
// (quieter) frames and the bars would stop punching on hits.
const ANALYSER_SMOOTHING = 0;

// Bars are log-spaced across this range so a kick (~50 Hz) and a hi-hat
// (~10 kHz) both get roughly the same number of bars.
const BAR_FREQ_LO_HZ = 30;
const BAR_FREQ_HI_HZ = 14_000;

// --- Bar level (rendering) ---------------------------------------------------
// Bar height is driven by PERCEPTUAL loudness (dB), not raw linear amplitude.
// Linear-amplitude bars are unusable: bass at -20 dB ≈ 0.1, mid at -40 dB ≈
// 0.01, high at -60 dB ≈ 0.001 — three orders of magnitude apart.
//
// On top of dB mapping we apply a PINK-NOISE COMPENSATION per bar: music has
// a natural -3 to -6 dB/octave rolloff, so without compensation highs sit
// 20+ dB below bass and look invisible even after dB mapping. The per-bar
// gain (computed in precomputeBarBins) tilts the spectrum back toward flat,
// making a high band that's "loud for highs" look as tall as bass that's
// "loud for bass".
const BAR_DB_FLOOR = -70;
const BAR_DB_CEILING = -10;
const BAR_DB_RANGE = BAR_DB_CEILING - BAR_DB_FLOOR;
// Pink compensation: +N dB per octave above the reference frequency, capped
// to keep ultra-high bins (often pure noise) from blowing up.
const BAR_GAIN_REFERENCE_HZ = 200;
const BAR_GAIN_DB_PER_OCTAVE = 4;
const BAR_GAIN_DB_CAP = 22;

// --- Bar contrast ------------------------------------------------------------
// The pink compensation above deliberately flattens the spectrum so highs stay
// visible — which makes the bars cluster at similar heights. To restore variety
// we stretch each bar's level around the live cross-bar MEAN: a bar's deviation
// from the average is multiplied by this gain, so small spectral differences
// fan out into large height differences. 1 = off (linear); higher = peakier.
const BAR_CONTRAST = 1.8;

// --- Bar spring physics ------------------------------------------------------
// Continuous-time damped spring: a' = -K*(a - target) - D*a'
//   - ω₀ = √K → stiffness/speed. K=900 → ω₀≈30 rad/s, natural period ≈ 210 ms.
//   - Damping ratio ζ = D / (2·√K) sets the CHARACTER of the return:
//       ζ < 1  underdamped — overshoots and bounces; LOWER ζ = MORE bounces
//              and a SLOWER settle (the wobble envelope decays as e^(−ζω₀t)).
//       ζ = 1  critically damped — fastest return with zero overshoot.
//       ζ > 1  overdamped — no bounce but sluggish.
// We want "responsive but not bouncy": ζ ≈ 0.65 → one small overshoot then a
// quick settle (~130 ms). D = 2·ζ·√K = 2·0.65·30 ≈ 40.
//   - For zero bounce, set D = 2·√K = 60 (critical).
//   - For snappier overall WITHOUT more bounce, raise K and D together keeping
//     the ratio (e.g. K=1600,D=72→ζ0.9); keep D·dt < 2 (dt capped at 33ms,
//     so D ≲ 60) or the explicit-Euler integrator goes unstable.
const SPRING_K = 900;
const SPRING_DAMPING = 5;
// Cap per-step dt before integrating to keep explicit Euler stable through
// long stalls (background tab, GC). Pulse decay still ages with true dt.
const MAX_STEP_DT_MS = 33;

// --- Per-bar flux response (snare/hat/tom punch) ----------------------------
// Each bar tracks its previous-frame amplitude. On a per-bar positive flux
// excursion above the floor we inject a velocity impulse into that bar —
// this is what makes snares visibly *crack* instead of swelling smoothly.
// Without it, a brief snare hit only nudges its bar's *level* and gets
// integrated into a soft bump; with it, the bar punches outward sharply
// on the attack and rings back via the spring.
//
// Saturation: impulse is capped via a soft clamp on flux contribution so a
// freakishly loud transient doesn't slingshot one bar across the screen.
const PER_BAR_FLUX_IMPULSE = 28;
const PER_BAR_FLUX_FLOOR = 0.02;
const PER_BAR_FLUX_CLAMP = 0.25;

// --- Kick timeline → magnitude ----------------------------------------------
// The precomputed timeline carries `power` ∈ ~[0, 1.1] (low-band thump +
// broadband transient against a fixed dB window). Map it to a visual magnitude
// the response below is tuned around: a solid kick (power ≈ 0.7) ≈ 1.0, a soft
// synth-synced hit (power ≈ 0.1) barely pumps, a big drop saturates the clamp.
const KICK_MAG_FLOOR = 0.15;
const KICK_MAG_SPAN = 1.3;

// --- Kick visual response ----------------------------------------------------
// Time constant of the kick envelope's exponential decay. Must be comparable to
// the spring's natural period (~200ms) — too short (e.g. 50ms) and the pump
// collapses before the slow spring can grow the bars toward the pumped target,
// so the kick is invisible. ~150ms = a clear swell that settles in a beat.
const KICK_PULSE_DECAY_TC_MS = 150;
// Multiplier on every bar's target on a unit-magnitude pulse (whole-ring swell).
const KICK_GLOBAL_PUMP = 1.2;
// Velocity impulse injected into every bar on a kick, scaled by maxAmplitude
// and the detected magnitude. ω₀≈30 with factor=6 → ~20% maxAmplitude punch
// at magnitude=1; with magnitude clamped at 1.5 the cap is ~30%.
const KICK_VEL_IMPULSE_FACTOR = 4.0;
// Extra impulse multiplier on the bass bars themselves — bottom of the
// ring punches harder than the top, so the kick *feels* low and heavy.
const KICK_BASS_VEL_BOOST = 1.9;
// Fraction of bars (from low end) counted as "bass" for the boost.
const BASS_BAR_FRACTION = 0.18;
// Upper bound on detected kick magnitude — keeps drops bounded so they
// don't pump 5x harder than a normal kick and saturate the visual.
const KICK_MAGNITUDE_CLAMP = 1.2;

// --- Rendering ---------------------------------------------------------------
const BAR_FILL_BASE_ALPHA = 0.22;

function dbToAmp(db: number): number {
  if (!isFinite(db)) return 0;
  return Math.pow(10, db / 20);
}

export class CircleAudioVisualizer implements Entity {
  private analyser: AnalyserNode;
  private dataArray: Float32Array;
  private hzPerBin: number;

  private barAmount: number;
  private radius: number;
  private maxAmplitude: number;

  private barAmplitude: Float32Array;
  private barVelocity: Float32Array;
  private barPrevAmp: Float32Array;
  private barBinLo: Int32Array;
  private barBinHi: Int32Array;
  // Precomputed per-bar pink-noise compensation gain (in dB) added to the
  // bar's average dB level before mapping. Frequency-dependent so highs get
  // boosted to match the natural amplitude of bass content.
  private barDbGain: Float32Array;
  // Scratch reused each frame by the two-pass contrast stretch: we need the
  // cross-bar mean level before we can stretch each bar around it.
  private barLevel: Float32Array;
  private barAvgAmp: Float32Array;

  private kickPulse = 0;

  private bassBarEnd: number;

  // Precomputed kick timeline (sorted by tMs) + a monotonic song clock. The
  // cursor advances over events whose time has passed; see pollKickTimeline.
  private kickEvents: readonly KickEvent[] = [];
  private kickCursor = 0;
  private songTimeMs: () => number = () => 0;

  constructor(audioContext: AudioContext, barAmount: number, radius: number, maxAmplitude: number) {
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = ANALYSER_SMOOTHING;
    // minDecibels / maxDecibels intentionally left at defaults — they only
    // affect getByteFrequencyData, and we use getFloatFrequencyData.
    this.dataArray = new Float32Array(this.analyser.frequencyBinCount);
    this.hzPerBin = audioContext.sampleRate / FFT_SIZE;

    this.barAmount = barAmount;
    this.radius = radius;
    this.maxAmplitude = maxAmplitude;

    this.barAmplitude = new Float32Array(barAmount);
    this.barVelocity = new Float32Array(barAmount);
    this.barPrevAmp = new Float32Array(barAmount);
    this.barBinLo = new Int32Array(barAmount);
    this.barBinHi = new Int32Array(barAmount);
    this.barDbGain = new Float32Array(barAmount);
    this.barLevel = new Float32Array(barAmount);
    this.barAvgAmp = new Float32Array(barAmount);
    this.precomputeBarBins();

    this.bassBarEnd = Math.max(1, Math.ceil(barAmount * BASS_BAR_FRACTION));
  }

  public connectSource(source: AudioNode): void {
    source.connect(this.analyser);
  }

  /**
   * Supply the precomputed kick timeline and the song clock that drives it.
   * `songTimeMs` must be monotonic non-decreasing within a play session
   * (BeatmapClock.now() — frozen on pause, never rewound). Events are assumed
   * sorted by tMs.
   */
  public setKickTimeline(events: readonly KickEvent[], songTimeMs: () => number): void {
    this.kickEvents = events;
    this.kickCursor = 0;
    this.songTimeMs = songTimeMs;
  }

  private precomputeBarBins(): void {
    const ratio = BAR_FREQ_HI_HZ / BAR_FREQ_LO_HZ;
    const maxBin = this.dataArray.length - 1;
    for (let i = 0; i < this.barAmount; i++) {
      const t0 = i / this.barAmount;
      const t1 = (i + 1) / this.barAmount;
      const f0 = BAR_FREQ_LO_HZ * Math.pow(ratio, t0);
      const f1 = BAR_FREQ_LO_HZ * Math.pow(ratio, t1);
      const lo = Math.max(1, Math.floor(f0 / this.hzPerBin));
      const hi = Math.max(lo + 1, Math.min(maxBin, Math.ceil(f1 / this.hzPerBin)));
      this.barBinLo[i] = lo;
      this.barBinHi[i] = hi;
      // Geometric center frequency of the bar, used for pink compensation.
      const centerHz = Math.sqrt(f0 * f1);
      const octaves = Math.max(0, Math.log2(centerHz / BAR_GAIN_REFERENCE_HZ));
      this.barDbGain[i] = Math.min(BAR_GAIN_DB_CAP, BAR_GAIN_DB_PER_OCTAVE * octaves);
    }
  }

  public update(tick: TickContext): void {
    if (this.analyser.context.state !== "running") return;

    // @ts-expect-error Float32Array generic mismatch between lib.dom and TS
    this.analyser.getFloatFrequencyData(this.dataArray);

    const stepDtSec = Math.min(tick.dt, MAX_STEP_DT_MS) / 1000;

    const kickMagnitude = this.pollKickTimeline();
    if (kickMagnitude > 0) {
      // Strongest recent kick wins until decay catches up — don't let a
      // weak ghost kick clobber a strong one mid-decay.
      this.kickPulse = Math.max(this.kickPulse, kickMagnitude);
    }
    // Real dt (not clamped) so the envelope ages correctly through hitches.
    this.kickPulse *= Math.exp(-tick.dt / KICK_PULSE_DECAY_TC_MS);

    const pumpMul = 1 + KICK_GLOBAL_PUMP * this.kickPulse;
    // Headroom above maxAmplitude so a kick's pump can visibly overshoot the
    // resting bar height rather than clipping immediately.
    const ampCap = this.maxAmplitude * 1.5;

    // Pass 1: per-bar perceptual level (+ avgAmp for the flux impulse), and
    // accumulate the cross-bar mean so we can stretch contrast around it.
    let sumLevel = 0;
    for (let i = 0; i < this.barAmount; i++) {
      const lo = this.barBinLo[i];
      const hi = this.barBinHi[i];
      // Linear-amplitude average across the bar's bins, THEN convert to dB.
      // Linear-then-dB properly weights the loudest bin (a single -15 dB
      // harmonic among quiet bins dominates, as it should). Pure dB
      // averaging would smear it with the quiet bins. The same avgAmp is
      // reused for the per-bar flux impulse below.
      let sumAmp = 0;
      for (let b = lo; b <= hi; b++) sumAmp += dbToAmp(this.dataArray[b]);
      const avgAmp = sumAmp / (hi - lo + 1);
      const avgDb = avgAmp > 1e-7 ? 20 * Math.log10(avgAmp) : -140;
      // Apply pink-noise compensation: highs get up to +22 dB to match
      // perceived loudness of bass. Then map to 0..1 via the dB window.
      const compensatedDb = avgDb + this.barDbGain[i];
      const level = Math.max(0, Math.min(1, (compensatedDb - BAR_DB_FLOOR) / BAR_DB_RANGE));
      this.barLevel[i] = level;
      this.barAvgAmp[i] = avgAmp;
      sumLevel += level;
    }
    const meanLevel = sumLevel / this.barAmount;

    // Pass 2: contrast-stretch each bar around the mean (small spectral
    // differences fan out into large height differences), then drive the
    // spring + per-bar flux impulse.
    for (let i = 0; i < this.barAmount; i++) {
      const stretched = Math.max(0, Math.min(1, meanLevel + (this.barLevel[i] - meanLevel) * BAR_CONTRAST));
      const target = stretched * pumpMul * this.maxAmplitude;

      // Per-bar flux impulse — makes percussive hits punch even when the
      // bar's *level* is unremarkable. Linear amp (not dB) so we react to
      // actual energy change, not log-domain jitter in quiet bins.
      const avgAmp = this.barAvgAmp[i];
      const prevAvg = this.barPrevAmp[i];
      this.barPrevAmp[i] = avgAmp;
      const rawFlux = avgAmp - prevAvg;
      let fluxImpulse = 0;
      if (rawFlux > PER_BAR_FLUX_FLOOR) {
        const eff = Math.min(PER_BAR_FLUX_CLAMP, rawFlux - PER_BAR_FLUX_FLOOR);
        fluxImpulse = eff * PER_BAR_FLUX_IMPULSE * this.maxAmplitude;
      }

      const a0 = this.barAmplitude[i];
      const v0 = this.barVelocity[i] + fluxImpulse;
      const force = -SPRING_K * (a0 - target) - SPRING_DAMPING * v0;
      let v = v0 + force * stepDtSec;
      let a = a0 + v * stepDtSec;

      if (a < 0) {
        a = 0;
        if (v < 0) v = 0;
      } else if (a > ampCap) {
        a = ampCap;
        if (v > 0) v = 0;
      }

      this.barAmplitude[i] = a;
      this.barVelocity[i] = v;
    }

    if (kickMagnitude > 0) {
      const impulse = KICK_VEL_IMPULSE_FACTOR * this.maxAmplitude * kickMagnitude;
      for (let i = 0; i < this.barAmount; i++) {
        const boost = i < this.bassBarEnd ? KICK_BASS_VEL_BOOST : 1;
        this.barVelocity[i] += impulse * boost;
      }
    }
  }

  /**
   * Advance over the precomputed kick timeline up to the current song time and
   * return the strongest magnitude among hits that just passed (0 if none).
   * Usually at most one event crosses per frame; after a long stall (tab
   * unbackgrounded) several may, and collapsing them to their max is the right
   * visual — one punch, scaled by the biggest hit in the gap.
   */
  private pollKickTimeline(): number {
    const now = this.songTimeMs();
    let magnitude = 0;
    while (this.kickCursor < this.kickEvents.length && this.kickEvents[this.kickCursor].tMs <= now) {
      const m = Math.min(KICK_MAGNITUDE_CLAMP, KICK_MAG_FLOOR + KICK_MAG_SPAN * this.kickEvents[this.kickCursor].power);
      if (m > magnitude) magnitude = m;
      this.kickCursor++;
    }
    return magnitude;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const angleStep = (Math.PI * 2) / this.barAmount;
    // Widen each sector by ~1px of arc on each side so neighbours overlap and
    // fuse into one filled region. Abutting sectors otherwise leave a 1px
    // anti-aliased seam — a thin radial line from centre to edge — at every
    // junction. Single fill() means the overlap doesn't double the alpha.
    const overlap = 1 / this.radius;

    // Additive: each bar is an annular sector between (radius - amp) and radius.
    // The union of all sectors (single nonzero-wound path, one fill) is the
    // ring of bars; the centre stays empty.
    ctx.beginPath();
    for (let i = 0; i < this.barAmount; i++) {
      // Bar 0 (lowest frequency) sits at the bottom; subsequent bars
      // alternate left/right so the spectrum mirrors symmetrically.
      const indexedI = i > 0 ? i + 1 : i;
      const angle = Math.floor(indexedI / 2) * angleStep * (indexedI % 2 === 0 ? 1 : -1) + Math.PI / 2 + angleStep / 2;
      const startAngle = angle - angleStep / 2 - overlap;
      const endAngle = angle + angleStep / 2 + overlap;
      const inner = this.radius - this.barAmplitude[i];

      ctx.moveTo(Math.cos(startAngle) * this.radius, Math.sin(startAngle) * this.radius);
      ctx.arc(0, 0, this.radius, startAngle, endAngle);
      ctx.arc(0, 0, inner, endAngle, startAngle, true);
      ctx.closePath();
    }

    ctx.fillStyle = `rgba(255, 255, 255, ${BAR_FILL_BASE_ALPHA})`;
    ctx.fill();
  }
}
