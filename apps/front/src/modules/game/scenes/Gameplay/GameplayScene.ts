import { BeatmapEndedEventType } from "@/modules/game/events/impl/BeatmapEndedEvent";
import { runKickAnalysis } from "@/modules/audio/kick-analysis/runKickAnalysis";
import type { KickEvent } from "@/modules/audio/kick-analysis/analyze";
import type { ParsedMap } from "../../../osu/convert/OsuConverter";
import { type SettingsListType } from "../../../settings/Settings";
import { EventEmitter } from "../../../utils/EventEmitter";
import { BackgroundEntity } from "../../entities/BackgroundEntity";
import { ScoreHUDEntity } from "../../entities/ScoreHUDEntity";
import { StickDotsEntity } from "../../entities/StickDotsEntity";
import { easeInOutCubic } from "../../engine/animation/Easing";
import type { Playable } from "../../engine/animation/Playable";
import { parallel } from "../../engine/animation/Timeline";
import { tween } from "../../engine/animation/Tween";
import { EXIT_FADE_DURATION_MS } from "../../engine/transitions/durations";
import { BeatmapClock } from "../../engine/BeatmapClock";
import { Container } from "../../engine/Container";
import type { Engine } from "../../engine/Engine";
import { gameplayRetry } from "../../engine/transitions/factories/gameplayRetry";
import { gameplayToBeatmapSelection } from "../../engine/transitions/factories/gameplayToBeatmapSelection";
import { gameplayToScores } from "../../engine/transitions/factories/gameplayToScores";
import { pauseEnter, pauseExit } from "../Pause/transitions";
import { ScoresScene } from "../Scores/ScoresScene";
import { CanvasScene } from "../CanvasScene";
import type { SceneTransitionSlot } from "../Scene";
import type { GameplayEvents } from "../../events/gameplayEvents";
import type { NoteHoldTickEventType } from "../../events/impl/NoteHoldTickEvent";
import type { NoteShouldSpawnEventType } from "../../events/impl/NoteShouldSpawnEvent";
import type { NoteWasJudgedEventType } from "../../events/impl/NoteWasJudgedEvent";
import { CircleAudioVisualizer } from "../../flair/CircleAudioVisualizer";
import { NoteHitFlair } from "../../flair/NoteHitFlair";
import { NoteHitGlowFlair } from "../../flair/NoteHitGlowFlair";
import { isHittingNote } from "../../hooks/hit-check";
import { JudgmentKind } from "../../judge/constants";
import { HoldNote } from "../../note/HoldNote";
import { Note } from "../../note/Note";
import { NoteColor } from "../../note/NoteColor";
import { NoteSpawner } from "../../note/NoteSpawner";
import { ScoreCounter } from "../../score/ScoreCounter";
import { GAME_CIRCLE_DISPLAYED_RADIUS, GAME_CIRCLE_RADIUS } from "../../utils/constants";
import { PauseScene } from "../Pause/PauseScene";

export const BEATMAP_AUDIO_ID = "beatmap_audio";

/** How long the circle's inner content (background, visualizer, HUD) eases in when gameplay begins. */
const BACKGROUND_FADE_IN_MS = 400;

export class GameplayScene extends CanvasScene {
  public readonly id = "gameplay";

  private parsedMap: ParsedMap;
  private settings: SettingsListType;

  private events = new EventEmitter<GameplayEvents>();
  private eventDisposers: (() => void)[] = [];

  private notesContainer = new Container();
  private fxContainer = new Container();
  private circleInnerContentContainer = new Container();

  private clock: BeatmapClock;
  private scoreCounter: ScoreCounter;
  private noteSpawner: NoteSpawner;
  private audioVisualizer: CircleAudioVisualizer;

  /** Circle sizing for this play, scaled by the user's "circle size" setting (visual only). */
  private readonly displayedRadius: number;
  private readonly noteRadius: number;

  private hasBootstrapped = false;
  /**
   * When true, onDestroy leaves the beatmap source playing — used by the
   * gameplay→scores hand-off so the music keeps going behind the scores UI.
   * The next scene (scores) is then responsible for stopping it on exit.
   */
  private retainMusicOnDestroy = false;

  constructor(engine: Engine, parsedMap: ParsedMap) {
    super(engine);
    this.parsedMap = parsedMap;
    this.settings = engine.settings.get();

    const scale = this.settings.gameplayCircleScale;
    this.displayedRadius = GAME_CIRCLE_DISPLAYED_RADIUS * scale;
    this.noteRadius = GAME_CIRCLE_RADIUS * scale;

    const musicContext = engine.audio.music.getAudioContext();
    this.clock = new BeatmapClock(musicContext);
    // Bar height scales with the circle so the visualizer keeps its proportions.
    this.audioVisualizer = new CircleAudioVisualizer(musicContext, 40, this.displayedRadius, 25 * scale);
    this.noteSpawner = new NoteSpawner(this.parsedMap.notes, this.events, this.clock, this.settings.scrollDuration);
    this.scoreCounter = new ScoreCounter(
      this.parsedMap.notes.length + this.parsedMap.notes.filter((n) => n.isHold).length,
    );

    // SFX preloading lives here (rather than on the engine) because they're
    // gameplay-specific. Fire-and-forget — the music buffer load in
    // `onEntered` typically gives them plenty of time to be ready by the
    // first hit/miss.
    void engine.audio.registerSfx("hit", "/hit.wav", 0.66);
    void engine.audio.registerSfx("miss", "/miss.ogg", 1);
  }

  public override async onEntered() {
    this.onAction("pause", () => this.openPauseMenu());

    // Re-activation after pause: resume audio NOW (i.e. after the pause-pop
    // transition has finished). Resuming earlier (e.g. in pause.onBeforeExit)
    // would un-pause the music while the overlay is still fading out.
    if (this.hasBootstrapped) {
      await this.engine.audio.music.resume();
      return;
    }

    this.buildSceneTree();
    this.registerEvents();

    // Enter with the circle's inner content hidden and ease it in, so the
    // background (plus visualizer + HUD) fades up rather than popping into
    // view. Runs concurrently with the buffer load + kick analysis, but is
    // awaited before scheduling playback so it finishes before the song begins.
    this.circleInnerContentContainer.alpha = 0;
    const fadeIn = this.engine.playables.play(
      tween({
        target: this.circleInnerContentContainer,
        to: { alpha: 1 },
        duration: BACKGROUND_FADE_IN_MS,
        easing: easeInOutCubic,
      }),
    );

    const music = this.engine.audio.music;
    const buffer = await music.loadBuffer(this.parsedMap.audioUrl);

    // Precompute the kick timeline from the whole waveform (HPSS onset
    // analysis, off the main thread) before playback starts, so the visualizer
    // can pulse on every percussive hit synced to the song clock. Failure here
    // is non-fatal — the spectrum bars still react to the live FFT.
    let kickEvents: KickEvent[] = [];
    try {
      kickEvents = await runKickAnalysis(buffer, this.parsedMap.audioUrl);
    } catch {
      kickEvents = [];
    }

    await fadeIn;

    const audioStartTimeSec = this.clock.schedule(this.noteSpawner.getInitialOffsetMs());
    const source = music.play(BEATMAP_AUDIO_ID, buffer, { startAt: audioStartTimeSec });
    this.audioVisualizer.connectSource(source);
    this.audioVisualizer.setKickTimeline(kickEvents, () => this.clock.now());

    this.root.add(this.noteSpawner);

    this.hasBootstrapped = true;
  }

  public override async onDestroy() {
    this.eventDisposers.forEach((off) => off());
    this.eventDisposers = [];
    // Leave the source playing if we're handing off to scores; otherwise
    // (retry, exit, etc.) stop it cleanly.
    if (!this.retainMusicOnDestroy) {
      this.engine.audio.music.stop(BEATMAP_AUDIO_ID);
    }
    this.clock.stop();
    await super.onDestroy();
  }

  public override scenePlayable(slot: SceneTransitionSlot, durationMs: number): Playable | null {
    if (slot !== "exit") return null;
    return this.buildExitFade(durationMs);
  }

  private buildExitFade(durationMs: number): Playable {
    // Fade every fadeable surface the scene owns — notes and fx hang off
    // root directly (so they can sit in front of the ring), so the inner
    // container alone wouldn't cover them.
    const fade = (target: { alpha: number }) =>
      tween({ target, to: { alpha: 0 }, duration: durationMs, easing: easeInOutCubic });
    return parallel([fade(this.circleInnerContentContainer), fade(this.notesContainer), fade(this.fxContainer)]);
  }

  public openPauseMenu() {
    // Suspend the music *before* the transition starts so it cuts when the
    // user presses pause — the visible fade-in plays over silence rather
    // than 350ms of still-playing music.
    void this.engine.audio.music.suspend();
    const resume = () => void this.sceneManager.transitionPop(pauseExit);
    void this.sceneManager.transitionPush(
      new PauseScene(this.engine, {
        onResume: resume,
        entries: [
          { id: "resume", label: "Resume", run: resume },
          { id: "retry", label: "Retry", run: () => void this.retryBeatmap() },
          { id: "exit", label: "Exit to selection", run: () => void this.exitToBeatmapSelection() },
        ],
      }),
      pauseEnter,
    );
  }

  public async retryBeatmap(): Promise<void> {
    await this.closePauseWithFade();
    const next = new GameplayScene(this.engine, this.parsedMap);
    void this.sceneManager.transitionReplace(next, gameplayRetry);
  }

  public async exitToBeatmapSelection(): Promise<void> {
    await this.closePauseWithFade();
    void this.sceneManager.transitionPop(gameplayToBeatmapSelection);
  }

  /**
   * Retry / exit-to-selection prelude:
   *   1. Stop the source so the brief resume/suspend dance during phase
   *      changes between pause's pop and gameplay's next transition can't
   *      produce an audible blip.
   *   2. Start the canvas-content fade on the persistent scheduler so it
   *      runs *in parallel* with the pause UI's DOM fade — by the time
   *      pause is gone, the notes are gone too.
   *   3. Await the pause pop. The caller then drives the gameplay-side
   *      transition (replace for retry, pop for exit).
   */
  private async closePauseWithFade(): Promise<void> {
    this.engine.audio.music.stop(BEATMAP_AUDIO_ID);
    void this.engine.playables.play(this.buildExitFade(EXIT_FADE_DURATION_MS));
    await this.sceneManager.transitionPop(pauseExit);
  }

  private buildSceneTree() {
    this.circleInnerContentContainer.add(
      new BackgroundEntity(this.parsedMap, this.engine.settings, { radius: this.displayedRadius }),
    );
    this.circleInnerContentContainer.add(this.audioVisualizer);
    this.circleInnerContentContainer.add(new ScoreHUDEntity(this.scoreCounter));

    // Children render in insertion order (back -> front).
    this.root.add(this.circleInnerContentContainer);
    this.root.add(this.engine.circle);
    this.root.add(this.notesContainer);
    this.root.add(this.fxContainer);
    this.root.add(new StickDotsEntity(this.inputSystem, this.engine.circle));
    // NoteSpawner is added after the clock is scheduled (in onEntered).
  }

  private onNoteShouldSpawn(event: NoteShouldSpawnEventType) {
    const { parsedNote } = event;
    const angleSpan = Math.max((Math.random() * Math.PI) / 3, Math.PI / 5);

    if (parsedNote.isHold) {
      this.notesContainer.add(
        new HoldNote(
          this.events,
          parsedNote.hitTime,
          this.settings.scrollDuration,
          this.clock,
          this.noteRadius,
          parsedNote.color,
          parsedNote.angle,
          angleSpan,
          parsedNote.holdDuration!,
          this.inputSystem,
          parsedNote.holdTicksHitTimes!,
        ),
      );
    } else {
      this.notesContainer.add(
        new Note(
          this.events,
          parsedNote.hitTime,
          this.settings.scrollDuration,
          this.clock,
          this.noteRadius,
          parsedNote.color,
          parsedNote.angle,
          angleSpan,
          this.inputSystem,
        ),
      );
    }
  }

  private onNoteHoldTick(event: NoteHoldTickEventType) {
    const stickDotPosition = this.getStick(event.note.getColor() === NoteColor.Red ? "left" : "right");

    if (!isHittingNote(stickDotPosition, event.note)) {
      this.miss();
      return;
    }

    this.scoreCounter.addHoldNoteTick(event.note.getHoldTickCount({ includeTail: true }));
  }

  private onNoteWasJudged(event: NoteWasJudgedEventType) {
    if (!(event.note instanceof Note || event.note instanceof HoldNote)) return;

    if (event.note.getJudgement() === JudgmentKind.Miss) {
      this.miss();
      if (!event.isNoteTail) this.spawnNoteHitGlowFlair(event.note);
      return;
    }

    if (event.isNoteTail && event.note instanceof HoldNote) {
      this.scoreCounter.addHoldNoteTick(event.note.getHoldTickCount({ includeTail: true }));
      return;
    }

    this.engine.audio.playSfx("hit");
    this.spawnNoteHitFlair(event.note);
    this.spawnNoteHitGlowFlair(event.note);
    this.scoreCounter.add(event.note.getJudgement(), { time: this.clock.now() });
  }

  private spawnNoteHitFlair(note: Note | HoldNote) {
    this.fxContainer.add(new NoteHitFlair(note.getStartAngle(), note.getEndAngle(), 400, "white", this.displayedRadius));
  }

  private spawnNoteHitGlowFlair(note: Note | HoldNote) {
    const color = (() => {
      switch (note.getJudgement()) {
        case JudgmentKind.Perfect:
          return "cyan";
        case JudgmentKind.Good:
          return "lime";
        case JudgmentKind.Meh:
          return "gold";
        case JudgmentKind.Miss:
          return "red";
        default:
          throw new Error("Invalid judgment kind for flair color");
      }
    })();
    this.fxContainer.add(new NoteHitGlowFlair(note.getStartAngle(), note.getEndAngle(), 400, color, this.displayedRadius));
  }

  private onBeatmapEnded(_event: BeatmapEndedEventType) {
    // Hand the music off to scores — it keeps playing through the transition
    // and behind the score screen until the user navigates away. The scores
    // scene owns score submission + leaderboard display from here on.
    this.retainMusicOnDestroy = true;
    void this.sceneManager.transitionReplace(
      new ScoresScene(this.engine, this.parsedMap, this.scoreCounter),
      gameplayToScores,
    );
  }

  private registerEvents() {
    this.eventDisposers.push(
      this.events.on("onNoteWasJudged", (e) => this.onNoteWasJudged(e)),
      this.events.on("onNoteShouldSpawn", (e) => this.onNoteShouldSpawn(e)),
      this.events.on("onNoteHoldTick", (e) => this.onNoteHoldTick(e)),
      this.events.on("onBeatmapEnded", (e) => this.onBeatmapEnded(e)),
      this.engine.settings.events.on("onSettingChanged", (e) => {
        if (e.key === "scrollDuration") {
          this.settings.scrollDuration = this.engine.settings.get().scrollDuration;
          this.noteSpawner.setScrollDuration(this.settings.scrollDuration);
        }
      }),
    );
  }

  private miss() {
    if (this.scoreCounter.getCombo() > 5) this.engine.audio.playSfx("miss");
    this.scoreCounter.add(JudgmentKind.Miss, { time: this.clock.now() });
  }
}
