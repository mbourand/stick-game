import { AudioManager } from "../../audio/AudioManager";
import { Clock } from "../utils/Clock";

export class CircleAudioVisualizer {
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private barAmount: number;
  private radius: number;
  private maxAmplitude: number;

  private barAmplitudes: Record<number, number> = {};

  private maxDataLevelMovingAverageSamples: number[] = [];
  private maxDataLevelMovingAverageSize = 10;
  private maxDataLevelRecordClock = new Clock(16 / 1000);

  constructor(barAmount: number, radius: number, maxAmplitude: number) {
    this.analyser = AudioManager.musicContext.createAnalyser();
    this.analyser.fftSize = 2048;
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    this.barAmount = barAmount;
    this.maxAmplitude = maxAmplitude;
    this.radius = radius;
  }

  public connectSource(source: AudioNode) {
    source.connect(this.analyser);
  }

  private getDataIndexFromBarIndex(barIndex: number) {
    const x = barIndex / this.barAmount;
    return Math.floor(((1 - (x + 1) ** -2) / (1 - 2 ** -2)) * this.dataArray.length * 0.33);
  }

  public getAverageMaxDataLevel() {
    const sum = this.maxDataLevelMovingAverageSamples.reduce((a, b) => a + b, 0);
    const missingSamples = this.maxDataLevelMovingAverageSize - this.maxDataLevelMovingAverageSamples.length;
    return (sum + 0.5 * missingSamples) / this.maxDataLevelMovingAverageSize;
  }

  public addMaxDataLevelSample(sample: number) {
    if (sample < 0.5) return;
    this.maxDataLevelMovingAverageSamples.push(sample);
    if (this.maxDataLevelMovingAverageSamples.length > this.maxDataLevelMovingAverageSize) {
      this.maxDataLevelMovingAverageSamples.shift();
    }
  }

  public update(deltaTime: number) {
    let lastDataLevel: number | null = null;

    if (this.maxDataLevelRecordClock.update(deltaTime)) {
      let maxDataLevel = 0;
      for (let i = 0; i < this.barAmount; i++)
        maxDataLevel = Math.max(maxDataLevel, this.dataArray[this.getDataIndexFromBarIndex(i)] / 255);
      this.addMaxDataLevelSample(maxDataLevel);
    }

    const avgMaxDataLevel = this.getAverageMaxDataLevel();

    for (let i = 0; i < this.barAmount; i++) {
      const easedDataIndex = this.getDataIndexFromBarIndex(i);
      const thisDataLevel = this.dataArray[easedDataIndex] / 255;

      const dataLevel = Math.min(
        Math.max((thisDataLevel * 0.75 + (lastDataLevel ?? thisDataLevel) * 0.25) / (avgMaxDataLevel + 1e-5), 0),
        1,
      );

      const amplitude = Math.min(dataLevel ** 7 * 4.8 * this.maxAmplitude, this.maxAmplitude);

      if (this.barAmplitudes[i] === undefined) {
        this.barAmplitudes[i] = amplitude;
      } else if (amplitude > this.barAmplitudes[i]) {
        this.barAmplitudes[i] = Math.min(this.barAmplitudes[i] + deltaTime * 0.1 * this.maxAmplitude, amplitude);
      } else {
        this.barAmplitudes[i] = Math.max(this.barAmplitudes[i] - deltaTime * 0.005 * this.maxAmplitude, 0);
      }

      lastDataLevel = thisDataLevel;
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    // @ts-expect-error zegze
    this.analyser.getByteFrequencyData(this.dataArray);

    const centerX = 0;
    const centerY = 0;
    const angleStep = (2 * Math.PI) / this.barAmount;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);

    for (let i = 0; i < this.barAmount; i++) {
      const indexedI = i > 0 ? i + 1 : i;
      const angle = Math.floor(indexedI / 2) * angleStep * (indexedI % 2 === 0 ? 1 : -1) + Math.PI / 2 + angleStep / 2;
      const startAngle = (angle - angleStep / 2 + Math.PI * 2) % (Math.PI * 2);
      const endAngle = (angle + angleStep / 2 + Math.PI * 2) % (Math.PI * 2);

      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, this.radius - this.barAmplitudes[i], endAngle, startAngle, true);
    }

    ctx.fillStyle = `rgba(255, 255, 255, 0.2)`;
    ctx.fill();
  }
}
