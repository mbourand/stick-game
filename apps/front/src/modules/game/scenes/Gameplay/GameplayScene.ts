import { AudioManager } from "../../../audio/AudioManager";
import { Gamepad } from "../../../gamepad/Gamepad";
import type { ParsedMap } from "../../../osu/convert/OsuConverter";
import { Settings, type SettingsListType } from "../../../settings/Settings";
import { EventManager } from "../../events/EventManager";
import type { NoteHoldTickEventType } from "../../events/impl/NoteHoldTickEventType";
import type { NoteReachedEndOfLifeEventType } from "../../events/impl/NoteReachedEndOfLifeEventType";
import type { NoteShouldSpawnEventType } from "../../events/impl/NoteShouldSpawnEvent";
import type { NoteWasJudgedEventType } from "../../events/impl/NoteWasJudgedEvent";
import { CircleAudioVisualizer } from "../../flair/CircleAudioVisualizer";
import { NoteHitFlair } from "../../flair/NoteHitFlair";
import { NoteHitGlowFlair } from "../../flair/NoteHitGlowFlair";
import { isHittingNote } from "../../hooks/hit-check";
import { JudgmentKind } from "../../judge/constants";
import { HoldNote } from "../../note/HoldNote";
import { BaseNote, Note } from "../../note/Note";
import { NoteColor } from "../../note/NoteColor";
import { NoteSpawner } from "../../note/NoteSpawner";
import { ScoreCounter } from "../../score/ScoreCounter";
import { GAME_CIRCLE_DISPLAYED_RADIUS, GAME_CIRCLE_RADIUS } from "../../utils/constants";
import { Scene } from "../Scene";
import type { SceneManager } from "../SceneManager";

export class GameplayScene extends Scene {
  private eventManager = new EventManager();
  private scoreCounter = new ScoreCounter();

  private audioVisualizer: CircleAudioVisualizer = new CircleAudioVisualizer(40, GAME_CIRCLE_DISPLAYED_RADIUS, 30);

  private offFunctions: (() => void)[] = [];

  private parsedMap: ParsedMap;
  private noteSpawner: NoteSpawner;

  private settings: SettingsListType;
  private backgroundLayerCanvas?: HTMLCanvasElement;

  private notes: Set<BaseNote> = new Set();
  private noteHitFlairs: Set<NoteHitFlair> = new Set();
  private noteHitGlowFlairs: Set<NoteHitGlowFlair> = new Set();
  private gamepad: Gamepad;
  private beatmapStarted = false;

  constructor(sceneManager: SceneManager, parsedMap: ParsedMap) {
    super(sceneManager);
    this.parsedMap = parsedMap;
    this.settings = Settings.getSettings();
    this.noteSpawner = new NoteSpawner(this.parsedMap.notes, this.eventManager, this.settings.scrollDuration);
    this.gamepad = new Gamepad(this.settings.gamepadMapping);
  }

  public async onEntered() {
    this.registerEvents();

    const [buffer] = await Promise.all([
      await AudioManager.loadSound(this.parsedMap.audioUrl, AudioManager.getInstance().musicContext),
      await this.loadBackgroundImage(),
    ]);

    const audioSource = AudioManager.playMusic("beatmap_audio", buffer, this.settings.volume);
    this.audioVisualizer.connectSource(audioSource);
    this.beatmapStarted = true;
  }

  public async onBeforeExit() {
    this.offFunctions.forEach((off) => off());
    this.offFunctions = [];
    AudioManager.stopSoundById("beatmap_audio");
    this.beatmapStarted = false;
  }

  public onDestroy(): void {
    return;
  }

  public update(deltaTime: number): void {
    if (!this.beatmapStarted) return;
    this.audioVisualizer.update(deltaTime);
    this.updateNotes(deltaTime);
  }

  public render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    if (this.backgroundLayerCanvas)
      ctx.drawImage(
        this.backgroundLayerCanvas,
        centerX - GAME_CIRCLE_DISPLAYED_RADIUS,
        centerY - GAME_CIRCLE_DISPLAYED_RADIUS,
        this.backgroundLayerCanvas.width,
        this.backgroundLayerCanvas.height,
      );

    ctx.strokeStyle = "white";
    ctx.fillStyle = "transparent";
    ctx.lineWidth = 10;

    ctx.beginPath();
    ctx.arc(centerX, centerY, GAME_CIRCLE_DISPLAYED_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.font = "64px Rostex";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.scoreCounter.getCombo().toString(), centerX, centerY);

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.font = "22px Rostex";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.scoreCounter.getScore().toString().padStart(6, "0"), centerX, centerY + 48);

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.font = "22px Rostex";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.scoreCounter.getAccuracy() + "%", centerX, centerY + 96);

    ctx.translate(centerX, centerY);
    this.audioVisualizer.render(ctx);
    ctx.resetTransform();

    for (const note of this.notes) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      note.render(ctx);
      ctx.resetTransform();
    }

    for (const flair of this.noteHitFlairs) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      flair.render(ctx);
      ctx.resetTransform();
    }

    for (const glowFlair of this.noteHitGlowFlairs) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      glowFlair.render(ctx);
      ctx.resetTransform();
    }

    if (this.gamepad) {
      const leftStickDot = this.gamepad.getClampedStickPosition("left");
      const rightStickDot = this.gamepad.getClampedStickPosition("right");

      this.drawStickFollowLine(
        ctx,
        centerX,
        centerY,
        centerX + leftStickDot.x * GAME_CIRCLE_DISPLAYED_RADIUS,
        centerY + leftStickDot.y * GAME_CIRCLE_DISPLAYED_RADIUS,
        "rgb(255, 0, 0, 0.5)",
      );
      this.drawStickFollowLine(
        ctx,
        centerX,
        centerY,
        centerX + rightStickDot.x * GAME_CIRCLE_DISPLAYED_RADIUS,
        centerY + rightStickDot.y * GAME_CIRCLE_DISPLAYED_RADIUS,
        "rgb(0, 0, 255, 0.5)",
      );
      this.drawStickDot(
        ctx,
        centerX + leftStickDot.x * GAME_CIRCLE_DISPLAYED_RADIUS,
        centerY + leftStickDot.y * GAME_CIRCLE_DISPLAYED_RADIUS,
        "red",
      );
      this.drawStickDot(
        ctx,
        centerX + rightStickDot.x * GAME_CIRCLE_DISPLAYED_RADIUS,
        centerY + rightStickDot.y * GAME_CIRCLE_DISPLAYED_RADIUS,
        "blue",
      );
    }
  }

  public getViewModel() {
    return null;
  }

  private updateNotes(deltaTime: number) {
    if (!this.noteSpawner) throw new Error("No note spawner available");

    this.noteSpawner.update(deltaTime);

    for (const note of this.notes) note.update(deltaTime);

    for (const flair of this.noteHitFlairs) {
      flair.update(deltaTime);
      if (flair.isFinished()) this.noteHitFlairs.delete(flair);
    }

    for (const glowFlair of this.noteHitGlowFlairs) {
      glowFlair.update(deltaTime);
      if (glowFlair.isFinished()) this.noteHitGlowFlairs.delete(glowFlair);
    }
  }

  private drawStickDot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawStickFollowLine(
    ctx: CanvasRenderingContext2D,
    circleCenterX: number,
    circleCenterY: number,
    x: number,
    y: number,
    color: string,
  ) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(circleCenterX, circleCenterY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.closePath();
  }

  private async loadBackgroundImage() {
    if (!this.parsedMap) throw new Error("No map loaded");

    this.backgroundLayerCanvas = document.createElement("canvas");

    const image = new Image();
    image.src = this.parsedMap.backgroundUrl;
    await image.decode();

    const imageMinSize = Math.min(image.width, image.height);
    const scale = (GAME_CIRCLE_DISPLAYED_RADIUS * 2) / imageMinSize;
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;

    this.backgroundLayerCanvas.width = GAME_CIRCLE_DISPLAYED_RADIUS * 2;
    this.backgroundLayerCanvas.height = GAME_CIRCLE_DISPLAYED_RADIUS * 2;

    const ctx = this.backgroundLayerCanvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    const { backgroundBlurriness, backgroundBrightness } = this.settings;
    ctx.filter = `blur(${backgroundBlurriness}px) brightness(${backgroundBrightness})`;
    ctx.beginPath();
    ctx.arc(GAME_CIRCLE_DISPLAYED_RADIUS, GAME_CIRCLE_DISPLAYED_RADIUS, GAME_CIRCLE_DISPLAYED_RADIUS, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(
      image,
      this.parsedMap.backgroundOffsetX * scale,
      this.parsedMap.backgroundOffsetY * scale,
      drawWidth,
      drawHeight,
    );
    ctx.filter = "none";
  }

  private onNoteReachedEndOfLife(event: NoteReachedEndOfLifeEventType) {
    this.notes.delete(event.note);
  }

  private onNoteHoldTick(event: NoteHoldTickEventType) {
    const stickDotPosition = this.gamepad.getClampedStickPosition(
      event.note.getColor() === NoteColor.Red ? "left" : "right",
    );

    if (!isHittingNote(stickDotPosition, event.note)) {
      this.miss();
      return;
    }

    this.scoreCounter.addHoldNoteTick();
  }

  private onNoteShouldSpawn(event: NoteShouldSpawnEventType) {
    if (event.parsedNote.isHold) {
      this.notes.add(
        new HoldNote(
          this.eventManager,
          this.settings.scrollDuration,
          GAME_CIRCLE_RADIUS,
          event.parsedNote.color,
          event.parsedNote.angle,
          Math.max((Math.random() * Math.PI) / 3, Math.PI / 5),
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          event.parsedNote.holdDuration!,
          60000 / event.parsedNote.effectiveBPMAtHitTime,
          this.gamepad,
        ),
      );
    } else {
      this.notes.add(
        new Note(
          this.eventManager,
          this.settings.scrollDuration,
          GAME_CIRCLE_RADIUS,
          event.parsedNote.color,
          event.parsedNote.angle,
          Math.max((Math.random() * Math.PI) / 3, Math.PI / 5),
          this.gamepad,
        ),
      );
    }
  }

  private onNoteWasJudged(event: NoteWasJudgedEventType) {
    if (!(event.note instanceof Note || event.note instanceof HoldNote)) {
      return;
    }

    if (event.note.getJudgement() === JudgmentKind.Miss) {
      this.miss();
      this.noteHitGlowFlairs.add(
        new NoteHitGlowFlair(event.note.getStartAngle(), event.note.getEndAngle(), 400, "red"),
      );
      return;
    }

    const flairColor = (() => {
      switch (event.note.getJudgement()) {
        case JudgmentKind.Perfect:
          return "cyan";
        case JudgmentKind.Good:
          return "lime";
        case JudgmentKind.Meh:
          return "gold";
        default:
          throw new Error("Invalid judgment kind for flair color");
      }
    })();

    AudioManager.playSound("hit");
    this.noteHitFlairs.add(new NoteHitFlair(event.note.getStartAngle(), event.note.getEndAngle(), 400, "white"));
    this.noteHitGlowFlairs.add(
      new NoteHitGlowFlair(event.note.getStartAngle(), event.note.getEndAngle(), 400, flairColor),
    );
    this.scoreCounter.add(event.note.getJudgement());
  }

  private registerEvents() {
    console.log("Registering game events...");
    const offNoteReachedEdge = this.eventManager.on("onNoteWasJudged", (...args) => this.onNoteWasJudged(...args));
    this.offFunctions.push(offNoteReachedEdge);
    const offNoteShouldSpawn = this.eventManager.on("onNoteShouldSpawn", (...args) => {
      this.onNoteShouldSpawn(...args);
    });
    this.offFunctions.push(offNoteShouldSpawn);
    const offNoteReachedEndOfLife = this.eventManager.on("onNoteReachedEndOfLife", (...args) =>
      this.onNoteReachedEndOfLife(...args),
    );
    this.offFunctions.push(offNoteReachedEndOfLife);
    const offNoteHoldTick = this.eventManager.on("onNoteHoldTick", (...args) => this.onNoteHoldTick(...args));
    this.offFunctions.push(offNoteHoldTick);

    const offSettingChanged = Settings.getEventManager().on("onSettingChanged", (e) => {
      if (e.key === "volume") {
        AudioManager.setVolumeById("beatmap_audio", Settings.getSettings().volume);
      } else if (e.key === "gamepadMapping") {
        this.gamepad.setMapping(e.value as SettingsListType["gamepadMapping"]);
      } else if (e.key === "scrollDuration") {
        this.settings.scrollDuration = Settings.getSettings().scrollDuration;
        this.noteSpawner.setScrollDuration(this.settings.scrollDuration);
      } else if (e.key === "backgroundBlurriness" || e.key === "backgroundBrightness") {
        this.settings.backgroundBlurriness = Settings.getSettings().backgroundBlurriness;
        this.settings.backgroundBrightness = Settings.getSettings().backgroundBrightness;
        this.loadBackgroundImage();
      }
    });
    this.offFunctions.push(offSettingChanged);
  }

  private miss() {
    if (this.scoreCounter.getCombo() > 5) AudioManager.playSound("miss");
    this.scoreCounter.add(JudgmentKind.Miss);
  }
}
