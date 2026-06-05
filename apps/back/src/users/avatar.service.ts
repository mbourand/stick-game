import { Injectable, Logger } from "@nestjs/common";
import sharp from "sharp";

/** A processed avatar ready to persist as `bytea` + its content type. */
export type ProcessedAvatar = {
  /** Prisma's `Bytes` is `Uint8Array<ArrayBuffer>`, so normalise off Node's `Buffer`. */
  data: Uint8Array<ArrayBuffer>;
  mime: string;
};

const AVATAR_SIZE = 256;
const AVATAR_MIME = "image/webp";

/**
 * Hosts we'll fetch a seed avatar from. The URL comes from a provider's profile
 * response, but we still pin it to the known provider CDNs over https so the
 * seed fetch can never be turned into a server-side request to an arbitrary host
 * (SSRF) if a provider response is ever unexpected.
 */
const ALLOWED_AVATAR_HOSTS = [/^cdn\.discordapp\.com$/, /(^|\.)googleusercontent\.com$/];

/**
 * Owns all avatar image processing: every avatar — whether uploaded by the
 * player or seeded from their provider profile — is normalised to a single
 * square webp here, so the rest of the app never deals with arbitrary formats
 * or sizes.
 */
@Injectable()
export class AvatarService {
  private readonly logger = new Logger(AvatarService.name);

  /** Resize/crop arbitrary image bytes to a square webp avatar. */
  async process(input: Buffer): Promise<ProcessedAvatar> {
    const buffer = await sharp(input)
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
    // Copy into a freshly-allocated ArrayBuffer so the type matches Prisma's
    // `Bytes` (Uint8Array<ArrayBuffer>), not Node's Buffer<ArrayBufferLike>.
    const data = new Uint8Array(buffer.byteLength);
    data.set(buffer);
    return { data, mime: AVATAR_MIME };
  }

  /** Best-effort fetch + process of a remote avatar (used to seed from a provider). */
  async fromUrl(url: string): Promise<ProcessedAvatar | null> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (parsed.protocol !== "https:" || !ALLOWED_AVATAR_HOSTS.some((host) => host.test(parsed.hostname))) {
      this.logger.warn(`Refusing to seed avatar from disallowed URL: ${url}`);
      return null;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await this.process(Buffer.from(await res.arrayBuffer()));
    } catch (error) {
      this.logger.warn(`Failed to seed avatar from ${url}: ${String(error)}`);
      return null;
    }
  }
}
