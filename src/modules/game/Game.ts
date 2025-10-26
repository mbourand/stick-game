import { AudioManager } from "../audio/AudioManager";
import type { ParsedMap } from "../convert/OsuConverter";
import type { Gamepad } from "../gamepad/Gamepad";
import { EventManager } from "./events/EventManager";
import type { NoteHoldTickEventType } from "./events/impl/NoteHoldTickEventType";
import type { NoteReachedEndOfLifeEventType } from "./events/impl/NoteReachedEndOfLifeEventType";
import type { NoteShouldSpawnEventType } from "./events/impl/NoteShouldSpawnEvent";
import type { NoteWasJudgedEventType } from "./events/impl/NoteWasJudgedEvent";
import { CircleAudioVisualizer } from "./flair/CircleAudioVisualizer";
import { NoteHitFlair } from "./flair/NoteHitFlair";
import { NoteHitGlowFlair } from "./flair/NoteHitGlowFlair";
import { isHittingNote } from "./hooks/hit-check";
import { JudgmentKind } from "./judge/constants";
import { HoldNote } from "./note/HoldNote";
import { BaseNote, Note } from "./note/Note";
import { NoteColor } from "./note/NoteColor";
import { NoteSpawner } from "./note/NoteSpawner";
import { ScoreCounter } from "./score/ScoreCounter";
import { GAME_CIRCLE_DISPLAYED_RADIUS, GAME_CIRCLE_RADIUS } from "./utils/constants";

export class Game {
  private lastFrameTime: number;
  private eventManager: EventManager = new EventManager();
  private offFunctions: (() => void)[];
  private noteSpawner: NoteSpawner | null = null;
  private started: boolean;
  private audioVisualizer: CircleAudioVisualizer | null;
  private backgroundLayerCanvas: HTMLCanvasElement;
  private parsedMap: ParsedMap | null = null;
  private canvas: HTMLCanvasElement | null = null;

  private notes: Set<BaseNote> = new Set();
  private noteHitFlairs: Set<NoteHitFlair> = new Set();
  private noteHitGlowFlairs: Set<NoteHitGlowFlair> = new Set();

  private scrollSpeed: number;

  private afterTick: () => void;

  private gamepad: Gamepad;
  private scoreCounter: ScoreCounter;

  constructor(afterTick: () => void, scrollSpeed: number, gamepad: Gamepad) {
    this.eventManager = new EventManager();
    this.scoreCounter = new ScoreCounter();
    this.offFunctions = [];
    this.started = false;
    this.audioVisualizer = null;
    this.lastFrameTime = 0;
    this.backgroundLayerCanvas = document.createElement("canvas");
    this.scrollSpeed = scrollSpeed;
    this.gamepad = gamepad;
    this.afterTick = afterTick;

    this.registerEvents();
  }

  private async loadBackgroundImage() {
    if (!this.parsedMap) throw new Error("No map loaded");

    const image = new Image();
    image.src = this.parsedMap.backgroundUrl;
    await image.decode();

    const imageMinSize = Math.min(image.width, image.height);
    const scale = (GAME_CIRCLE_DISPLAYED_RADIUS * 2) / imageMinSize;
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;

    this.backgroundLayerCanvas.width = GAME_CIRCLE_DISPLAYED_RADIUS * 2;
    this.backgroundLayerCanvas.height = GAME_CIRCLE_DISPLAYED_RADIUS * 2;

    const ctx = this.backgroundLayerCanvas.getContext("2d")!;
    ctx.filter = "blur(4px) brightness(0.15)";
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

  public reset() {
    this.scoreCounter = new ScoreCounter();
    this.notes.clear();
    this.noteHitFlairs.clear();
    this.backgroundLayerCanvas = document.createElement("canvas");
    this.parsedMap = null;
    this.noteSpawner = null;
    this.started = false;
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
          this.scrollSpeed,
          GAME_CIRCLE_RADIUS,
          event.parsedNote.color,
          event.parsedNote.angle,
          Math.max((Math.random() * Math.PI) / 3, Math.PI / 5),
          event.parsedNote.holdDuration!,
          60000 / event.parsedNote.effectiveBPMAtHitTime,
          this.gamepad,
        ),
      );
    } else {
      this.notes.add(
        new Note(
          this.eventManager,
          this.scrollSpeed,
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
  }

  public setScrollSpeed(scrollSpeed: number) {
    this.scrollSpeed = scrollSpeed;
    this.noteSpawner?.setScrollSpeed(scrollSpeed);
  }

  private miss() {
    if (this.scoreCounter.getCombo() > 5) AudioManager.playSound("miss");
    this.scoreCounter.add(JudgmentKind.Miss);
  }

  public destroy() {
    console.log("Destroying game...");
    this.offFunctions.forEach((off) => off());
    this.offFunctions = [];
    AudioManager.stopSoundById("beatmap_audio");
  }

  public async loadBeatmap(parsedMap: ParsedMap) {
    this.parsedMap = parsedMap;
    this.noteSpawner = new NoteSpawner(parsedMap.notes, this.eventManager, this.scrollSpeed);
    await this.loadBackgroundImage();
  }

  public async start(canvas: HTMLCanvasElement) {
    if (!this.parsedMap || !this.noteSpawner) {
      throw new Error("Cannot start game: no beatmap loaded");
    }

    this.canvas = canvas;

    const buffer = await AudioManager.loadSound(this.parsedMap.audioUrl, AudioManager.musicContext);
    const audioSource = AudioManager.playMusic("beatmap_audio", buffer, 0.2);

    this.audioVisualizer = new CircleAudioVisualizer(40, GAME_CIRCLE_DISPLAYED_RADIUS, 30);
    this.audioVisualizer.connectSource(audioSource);

    this.started = true;
    this.lastFrameTime = performance.now();
  }

  public tick() {
    if (!this.started) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.update(deltaTime);
    this.afterTick();
  }

  private update(deltaTime: number) {
    if (!this.canvas || !this.started) return;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw stroke circle
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

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

    if (this.audioVisualizer) {
      ctx.translate(centerX, centerY);
      this.audioVisualizer.update(deltaTime);
      this.audioVisualizer.render(ctx);
      ctx.resetTransform();
    }

    const gamepad = navigator.getGamepads()[0];

    this.updateNotes(ctx, deltaTime);

    if (gamepad) {
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

  private updateNotes(ctx: CanvasRenderingContext2D, deltaTime: number) {
    if (!this.canvas) throw new Error("No canvas available");
    if (!this.noteSpawner) throw new Error("No note spawner available");

    this.noteSpawner.update(deltaTime);

    for (const note of this.notes) {
      ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
      note.update(deltaTime);
      note.render(ctx);
      ctx.resetTransform();
    }

    for (const flair of this.noteHitFlairs) {
      ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
      flair.update(deltaTime);
      flair.render(ctx);
      if (flair.isFinished()) this.noteHitFlairs.delete(flair);
      ctx.resetTransform();
    }

    for (const glowFlair of this.noteHitGlowFlairs) {
      ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
      glowFlair.update(deltaTime);
      glowFlair.render(ctx);
      if (glowFlair.isFinished()) this.noteHitGlowFlairs.delete(glowFlair);
      ctx.resetTransform();
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
}
