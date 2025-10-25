import { AudioManager } from "../audio/AudioManager";
import type { ParsedMap } from "../convert/OsuConverter";
import { GamepadAxisKind } from "../gamepad/utils/constants";
import { EventManager } from "./events/EventManager";
import type { NoteHoldTickEventType } from "./events/impl/NoteHoldTickEventType";
import type { NoteReachedEdgeEventType } from "./events/impl/NoteReachedEdgeEvent";
import type { NoteReachedEndOfLifeEventType } from "./events/impl/NoteReachedEndOfLifeEventType";
import type { NoteShouldSpawnEventType } from "./events/impl/NoteShouldSpawnEvent";
import { CircleAudioVisualizer } from "./flair/CircleAudioVisualizer";
import { NoteHitFlair } from "./flair/NoteHitFlair";
import { isHittingNote } from "./hooks/hit-check";
import { HoldNote } from "./note/HoldNote";
import { BaseNote, Note } from "./note/Note";
import { NoteColor } from "./note/NoteColor";
import { NoteSpawner } from "./note/NoteSpawner";
import { GAME_CIRCLE_RADIUS } from "./utils/constants";

export class Game {
  private lastFrameTime: number;
  private eventManager: EventManager = new EventManager();
  private offFunctions: (() => void)[];
  private combo: number;
  private noteSpawner: NoteSpawner | null = null;
  private started: boolean;
  private score: number;
  private audioVisualizer: CircleAudioVisualizer | null;
  private backgroundLayerCanvas: HTMLCanvasElement;
  private parsedMap: ParsedMap | null = null;
  private canvas: HTMLCanvasElement | null = null;

  private notes: Set<BaseNote> = new Set();
  private noteHitFlairs: Set<NoteHitFlair> = new Set();

  private scrollSpeed: number;

  private afterTick: () => void;

  constructor(afterTick: () => void, scrollSpeed: number) {
    this.eventManager = new EventManager();
    this.combo = 0;
    this.score = 0;
    this.offFunctions = [];
    this.started = false;
    this.audioVisualizer = null;
    this.lastFrameTime = 0;
    this.backgroundLayerCanvas = document.createElement("canvas");
    this.scrollSpeed = scrollSpeed;
    this.afterTick = afterTick;

    this.registerEvents();
  }

  private async loadBackgroundImage() {
    if (!this.parsedMap) throw new Error("No map loaded");

    const image = new Image();
    image.src = this.parsedMap.backgroundUrl;
    await image.decode();

    const imageMinSize = Math.min(image.width, image.height);
    const scale = (GAME_CIRCLE_RADIUS * 2) / imageMinSize;
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;

    this.backgroundLayerCanvas.width = GAME_CIRCLE_RADIUS * 2;
    this.backgroundLayerCanvas.height = GAME_CIRCLE_RADIUS * 2;

    const ctx = this.backgroundLayerCanvas.getContext("2d")!;
    ctx.filter = "blur(12px) brightness(0.15)";
    ctx.beginPath();
    ctx.arc(GAME_CIRCLE_RADIUS, GAME_CIRCLE_RADIUS, GAME_CIRCLE_RADIUS, 0, Math.PI * 2);
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
    this.combo = 0;
    this.score = 0;
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
    const stickDotPosition = this.getStickDotFromAxis(
      navigator.getGamepads()[0]!,
      event.note.getColor() === NoteColor.Red ? GamepadAxisKind.LeftStickX : GamepadAxisKind.RightStickX,
      event.note.getColor() === NoteColor.Red ? GamepadAxisKind.LeftStickY : GamepadAxisKind.RightStickY,
      1,
    );

    if (!isHittingNote(stickDotPosition, event.note)) {
      this.miss();
      return;
    }

    this.combo += 1;
    this.score += 15 * this.combo;
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
        ),
      );
    }
  }

  private onNoteReachedEdge(event: NoteReachedEdgeEventType) {
    if (!(event.note instanceof Note || event.note instanceof HoldNote)) {
      return;
    }

    const stickDotPosition = this.getStickDotFromAxis(
      navigator.getGamepads()[0]!,
      event.note.getColor() === NoteColor.Red ? GamepadAxisKind.LeftStickX : GamepadAxisKind.RightStickX,
      event.note.getColor() === NoteColor.Red ? GamepadAxisKind.LeftStickY : GamepadAxisKind.RightStickY,
      1,
    );

    if (!isHittingNote(stickDotPosition, event.note)) {
      this.miss();
      return;
    }

    AudioManager.playSound("hit");
    this.noteHitFlairs.add(new NoteHitFlair(event.note.getStartAngle(), event.note.getEndAngle(), 150, "white"));
    this.combo += 1;
    this.score += 100 * this.combo;
  }

  private registerEvents() {
    console.log("Registering game events...");
    const offNoteReachedEdge = this.eventManager.on("onNoteReachedEdge", (...args) => this.onNoteReachedEdge(...args));
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

  private getStickDotFromAxis(
    gamepad: Gamepad,
    axisKindX: GamepadAxisKind,
    axisKindY: GamepadAxisKind,
    sensivity: number,
  ) {
    const axisX = gamepad ? Math.min(Math.max(gamepad.axes[axisKindX] * sensivity, -1), 1) : 0;
    const axisY = gamepad ? Math.min(Math.max(gamepad.axes[axisKindY] * sensivity, -1), 1) : 0;
    const length = Math.sqrt(axisX * axisX + axisY * axisY);
    const normalizedX = length > 1 ? axisX / length : axisX;
    const normalizedY = length > 1 ? axisY / length : axisY;
    return { x: normalizedX, y: normalizedY };
  }

  public setScrollSpeed(scrollSpeed: number) {
    this.scrollSpeed = scrollSpeed;
    this.noteSpawner?.setScrollSpeed(scrollSpeed);
  }

  private miss() {
    if (this.combo > 5) AudioManager.playSound("miss");
    this.combo = 0;
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

    this.audioVisualizer = new CircleAudioVisualizer(40, GAME_CIRCLE_RADIUS, 30);
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
      centerX - GAME_CIRCLE_RADIUS,
      centerY - GAME_CIRCLE_RADIUS,
      this.backgroundLayerCanvas.width,
      this.backgroundLayerCanvas.height,
    );

    ctx.strokeStyle = "white";
    ctx.fillStyle = "transparent";
    ctx.lineWidth = 10;

    ctx.beginPath();
    ctx.arc(centerX, centerY, GAME_CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.font = "64px Rostex";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.combo.toString(), centerX, centerY);

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.font = "22px Rostex";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.score.toString().padStart(6, "0"), centerX, centerY + 48);

    if (this.audioVisualizer) {
      ctx.translate(centerX, centerY);
      this.audioVisualizer.update(deltaTime);
      this.audioVisualizer.render(ctx);
      ctx.resetTransform();
    }

    const gamepad = navigator.getGamepads()[0];
    this.updateNotes(ctx, deltaTime);

    if (gamepad) {
      const sensivity = 1;
      const leftStickDot = this.getStickDotFromAxis(
        gamepad,
        GamepadAxisKind.LeftStickX,
        GamepadAxisKind.LeftStickY,
        sensivity,
      );
      const rightStickDot = this.getStickDotFromAxis(
        gamepad,
        GamepadAxisKind.RightStickX,
        GamepadAxisKind.RightStickY,
        sensivity,
      );

      this.drawStickFollowLine(
        ctx,
        centerX,
        centerY,
        centerX + leftStickDot.x * GAME_CIRCLE_RADIUS,
        centerY + leftStickDot.y * GAME_CIRCLE_RADIUS,
        "rgb(255, 0, 0, 0.5)",
      );
      this.drawStickFollowLine(
        ctx,
        centerX,
        centerY,
        centerX + rightStickDot.x * GAME_CIRCLE_RADIUS,
        centerY + rightStickDot.y * GAME_CIRCLE_RADIUS,
        "rgb(0, 0, 255, 0.5)",
      );
      this.drawStickDot(
        ctx,
        centerX + leftStickDot.x * GAME_CIRCLE_RADIUS,
        centerY + leftStickDot.y * GAME_CIRCLE_RADIUS,
        "red",
      );
      this.drawStickDot(
        ctx,
        centerX + rightStickDot.x * GAME_CIRCLE_RADIUS,
        centerY + rightStickDot.y * GAME_CIRCLE_RADIUS,
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
