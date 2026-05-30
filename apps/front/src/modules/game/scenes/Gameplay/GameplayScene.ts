import { BeatmapEndedEventType } from "@/modules/game/events/impl/BeatmapEndedEvent";
import { browserQueryClient } from "@/components/QueryProvider";
import { localScoresBeatmapLeaderboardQueryOptions } from "@/modules/db/queries/local-scores-beatmap-leaderboard";
import { scoresBeatmapLeaderboardQueryOptions } from "@/modules/fetching/back/queries/scores-beatmap-leaderboard";
import { submitScore } from "@/modules/score/submit-score";
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
import type { CircleLayer } from "../../engine/layers/CircleLayer";
import type { TickContext } from "../../engine/TickContext";
import { gameplayRetry } from "../../engine/transitions/factories/gameplayRetry";
import { gameplayToBeatmapSelection } from "../../engine/transitions/factories/gameplayToBeatmapSelection";
import { gameplayToScores } from "../../engine/transitions/factories/gameplayToScores";
import { pauseEnter, pauseExit } from "../Pause/transitions";
import { ScoresScene } from "../Scores/ScoresScene";
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
import { Scene } from "../Scene";

export const BEATMAP_AUDIO_ID = "beatmap_audio";

export class GameplayScene extends Scene {
  public readonly id = "gameplay";
  public override readonly rendersWhenInactive = true;

  private parsedMap: ParsedMap;
  private settings: SettingsListType;

  private events = new EventEmitter<GameplayEvents>();
  private eventDisposers: (() => void)[] = [];

  private root = new Container();
  private notesContainer = new Container();
  private fxContainer = new Container();
  private circleInnerContentContainer = new Container();
  private circle: CircleLayer;

  private clock: BeatmapClock;
  private scoreCounter: ScoreCounter;
  private noteSpawner: NoteSpawner;
  private audioVisualizer: CircleAudioVisualizer;

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
    this.settings = engine.getSettings().get();
    this.circle = engine.circle;

    const musicContext = engine.getAudio().music.getAudioContext();
    this.clock = new BeatmapClock(musicContext);
    this.audioVisualizer = new CircleAudioVisualizer(musicContext, 40, GAME_CIRCLE_DISPLAYED_RADIUS, 30);
    this.noteSpawner = new NoteSpawner(this.parsedMap.notes, this.events, this.clock, this.settings.scrollDuration);
    this.scoreCounter = new ScoreCounter(
      this.parsedMap.notes.length + this.parsedMap.notes.filter((n) => n.isHold).length,
    );

    // SFX preloading lives here (rather than on the engine) because they're
    // gameplay-specific. Fire-and-forget — the music buffer load in
    // `onEntered` typically gives them plenty of time to be ready by the
    // first hit/miss.
    void engine.getAudio().registerSfx("hit", "/hit.wav", 0.66);
    void engine.getAudio().registerSfx("miss", "/miss.ogg", 1);
  }

  public override async onEntered() {
    this.onAction("pause", () => this.openPauseMenu());

    // Re-activation after pause: resume audio NOW (i.e. after the pause-pop
    // transition has finished). Resuming earlier (e.g. in pause.onBeforeExit)
    // would un-pause the music while the overlay is still fading out.
    if (this.hasBootstrapped) {
      await this.engine.getAudio().music.resume();
      return;
    }

    this.buildSceneTree();
    this.registerEvents();

    const music = this.engine.getAudio().music;
    const buffer = await music.loadBuffer(this.parsedMap.audioUrl);
    const audioStartTimeSec = this.clock.schedule(this.noteSpawner.getInitialOffsetMs());
    const source = music.play(BEATMAP_AUDIO_ID, buffer, { startAt: audioStartTimeSec });
    this.audioVisualizer.connectSource(source);

    this.root.add(this.noteSpawner);

    this.hasBootstrapped = true;
  }

  public override async onDestroy() {
    this.eventDisposers.forEach((off) => off());
    this.eventDisposers = [];
    this.root.detach(this.circle);
    this.root.destroy();
    // Leave the source playing if we're handing off to scores; otherwise
    // (retry, exit, etc.) stop it cleanly.
    if (!this.retainMusicOnDestroy) {
      this.engine.getAudio().music.stop(BEATMAP_AUDIO_ID);
    }
    this.clock.stop();
  }

  public override exitFadePlayable(durationMs: number): Playable {
    // Fade every fadeable surface the scene owns — notes and fx hang off
    // root directly (so they can sit in front of the ring), so the inner
    // container alone wouldn't cover them.
    const fade = (target: { alpha: number }) =>
      tween({ target, to: { alpha: 0 }, duration: durationMs, easing: easeInOutCubic });
    return parallel([
      fade(this.circleInnerContentContainer),
      fade(this.notesContainer),
      fade(this.fxContainer),
    ]);
  }

  public openPauseMenu() {
    // Suspend the music *before* the transition starts so it cuts when the
    // user presses pause — the visible fade-in plays over silence rather
    // than 350ms of still-playing music.
    void this.engine.getAudio().music.suspend();
    void this.sceneManager.transitionPush(
      new PauseScene(this.engine, [
        // Index 0 doubles as the back/pause-key shortcut in PauseScene — keep
        // "resume" first.
        { id: "resume", label: "Resume", run: () => void this.sceneManager.transitionPop(pauseExit) },
        { id: "retry", label: "Retry", run: () => void this.retryBeatmap() },
        { id: "exit", label: "Exit to selection", run: () => void this.exitToBeatmapSelection() },
      ]),
      pauseEnter,
    );
  }

  /**
   * Retry/exit flow:
   *   1. Stop the source (the brief resume/suspend dance during phase
   *      changes between pause's pop and gameplay's next transition would
   *      otherwise produce an audible blip).
   *   2. Start the canvas-content fade on the persistent tween scheduler so
   *      it runs *in parallel* with the pause UI's DOM fade — by the time
   *      pause is gone, the notes are gone too.
   *   3. Await the pause pop, then drive the gameplay-side transition.
   */
  public async retryBeatmap(): Promise<void> {
    this.engine.getAudio().music.stop(BEATMAP_AUDIO_ID);
    void this.engine.playables.play(this.exitFadePlayable(EXIT_FADE_DURATION_MS));
    await this.sceneManager.transitionPop(pauseExit);
    const next = new GameplayScene(this.engine, this.parsedMap);
    void this.sceneManager.transitionReplace(next, gameplayRetry);
  }

  public async exitToBeatmapSelection(): Promise<void> {
    this.engine.getAudio().music.stop(BEATMAP_AUDIO_ID);
    void this.engine.playables.play(this.exitFadePlayable(EXIT_FADE_DURATION_MS));
    await this.sceneManager.transitionPop(pauseExit);
    void this.sceneManager.transitionPop(gameplayToBeatmapSelection);
  }

  public override update(tick: TickContext): void {
    this.root.update(tick);
  }

  public override render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    this.root.x = canvas.width / 2;
    this.root.y = canvas.height / 2;
    this.root.render(ctx);
  }

  private buildSceneTree() {
    this.circleInnerContentContainer.add(new BackgroundEntity(this.parsedMap, this.engine.getSettings()));
    this.circleInnerContentContainer.add(this.audioVisualizer);
    this.circleInnerContentContainer.add(new ScoreHUDEntity(this.scoreCounter));

    // Children render in insertion order (back -> front).
    this.root.add(this.circleInnerContentContainer);
    this.root.add(this.circle);
    this.root.add(this.notesContainer);
    this.root.add(this.fxContainer);
    this.root.add(new StickDotsEntity(this.inputSystem, this.circle));
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
          GAME_CIRCLE_RADIUS,
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
          GAME_CIRCLE_RADIUS,
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

    this.engine.getAudio().playSfx("hit");
    this.spawnNoteHitFlair(event.note);
    this.spawnNoteHitGlowFlair(event.note);
    this.scoreCounter.add(event.note.getJudgement());
  }

  private spawnNoteHitFlair(note: Note | HoldNote) {
    this.fxContainer.add(new NoteHitFlair(note.getStartAngle(), note.getEndAngle(), 400, "white"));
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
    this.fxContainer.add(new NoteHitGlowFlair(note.getStartAngle(), note.getEndAngle(), 400, color));
  }

  private async onBeatmapEnded(_event: BeatmapEndedEventType) {
    // Hand the music off to scores — it keeps playing through the transition
    // and behind the score screen until the user navigates away.
    this.retainMusicOnDestroy = true;
    void this.sceneManager.transitionReplace(
      new ScoresScene(this.engine, this.parsedMap, this.scoreCounter),
      gameplayToScores,
    );

    const { backendResult, localResult } = await submitScore({
      accuracy: this.scoreCounter.getAccuracy(),
      score: this.scoreCounter.getScore(),
      maxCombo: this.scoreCounter.getMaxCombo(),
      playerName: this.settings.playerName,
      missCount: this.scoreCounter.getJudgmentCount(JudgmentKind.Miss),
      mehCount: this.scoreCounter.getJudgmentCount(JudgmentKind.Meh),
      goodCount: this.scoreCounter.getJudgmentCount(JudgmentKind.Good),
      greatCount: 0,
      perfectCount: this.scoreCounter.getJudgmentCount(JudgmentKind.Perfect),
      beatmapId: this.parsedMap.id,
    });

    if (backendResult.status === "fulfilled" && backendResult.value.wasUploaded) {
      const queryKey = scoresBeatmapLeaderboardQueryOptions(this.parsedMap.id, 3).queryKey;
      browserQueryClient?.invalidateQueries({ queryKey });
    }

    if (localResult.status === "fulfilled") {
      const queryKey = localScoresBeatmapLeaderboardQueryOptions(this.parsedMap.id, 3).queryKey;
      browserQueryClient?.invalidateQueries({ queryKey });
    }

    if (backendResult.status === "rejected") {
      console.error("Failed to submit score to backend:", backendResult.reason);
      alert("Score submission on global leaderboard failed, check the console for more details");
    }

    if (localResult.status === "rejected") {
      console.error("Failed to save score locally:", localResult.reason);
      alert("Score submission on local leaderboard failed, check the console for more details");
    }
  }

  private registerEvents() {
    this.eventDisposers.push(
      this.events.on("onNoteWasJudged", (e) => this.onNoteWasJudged(e)),
      this.events.on("onNoteShouldSpawn", (e) => this.onNoteShouldSpawn(e)),
      this.events.on("onNoteHoldTick", (e) => this.onNoteHoldTick(e)),
      this.events.on("onBeatmapEnded", (e) => this.onBeatmapEnded(e)),
      this.engine.getSettings().events.on("onSettingChanged", (e) => {
        if (e.key === "scrollDuration") {
          this.settings.scrollDuration = this.engine.getSettings().get().scrollDuration;
          this.noteSpawner.setScrollDuration(this.settings.scrollDuration);
        }
      }),
    );
  }

  private miss() {
    if (this.scoreCounter.getCombo() > 5) this.engine.getAudio().playSfx("miss");
    this.scoreCounter.add(JudgmentKind.Miss);
  }
}
