import { AudioManager } from "../../audio/AudioManager";

export class CircleAudioVisualizer {
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private barAmount: number;
  private radius: number;
  private maxAmplitude: number;

  private barAmplitudes: Record<number, number> = {};

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

  public update(deltaTime: number) {
    for (let i = 0; i < this.barAmount; i++) {
      const dataIndex = Math.floor((i / this.barAmount) * (this.dataArray.length * 0.66));
      const dataLevel = this.dataArray[dataIndex] / 255;
      const amplitude = Math.min(dataLevel ** 4.8 * 4.2 * this.maxAmplitude, this.maxAmplitude);

      if (this.barAmplitudes[i] === undefined) {
        this.barAmplitudes[i] = amplitude;
      } else if (amplitude > this.barAmplitudes[i]) {
        this.barAmplitudes[i] = Math.min(this.barAmplitudes[i] + deltaTime * 0.1 * this.maxAmplitude, amplitude);
      } else {
        this.barAmplitudes[i] = Math.max(this.barAmplitudes[i] - deltaTime * 0.005 * this.maxAmplitude, 0);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    this.analyser.getByteFrequencyData(this.dataArray);

    const centerX = 0;
    const centerY = 0;
    const angleStep = (2 * Math.PI) / this.barAmount;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);

    for (let i = 0; i < this.barAmount; i++) {
      const angle = i * angleStep;
      const startAngle = (angle - angleStep / 2) % (Math.PI * 2);
      const endAngle = (angle + angleStep / 2) % (Math.PI * 2);

      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, this.radius - this.barAmplitudes[i], endAngle, startAngle, true);
    }

    ctx.fillStyle = `rgba(255, 255, 255, 0.2)`;
    ctx.fill();
  }
}
