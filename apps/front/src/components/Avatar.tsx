import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

type AvatarProps = {
  /** Avatar image URL, or null/undefined to show the initial fallback. */
  src?: string | null;
  /** Display name — drives the initial fallback and alt text. */
  name: string;
  /** Pixel size of the (square, circular) avatar. */
  size?: number;
  className?: string;
};

/**
 * Circular account avatar with a graceful fallback: shows the image when one is
 * available and loads, otherwise the name's first initial on a muted disc.
 * Shared by the leaderboard rows, the menu player card, and the profile scene.
 */
export const Avatar = ({ src, name, size = 36, className }: AvatarProps) => {
  const [failed, setFailed] = useState(false);
  // A new src (e.g. after an avatar upload busts the cache) deserves a fresh
  // load attempt, even if the previous one errored.
  useEffect(() => setFailed(false), [src]);
  const showImage = src && !failed;

  return (
    <div
      className={twMerge(
        "relative shrink-0 rounded-full overflow-hidden bg-white/10 border border-white/20 flex items-center justify-center",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
          draggable={false}
        />
      ) : (
        <span className="font-semibold uppercase text-white/70" style={{ fontSize: size * 0.42 }}>
          {name.trim().charAt(0) || "?"}
        </span>
      )}
    </div>
  );
};
