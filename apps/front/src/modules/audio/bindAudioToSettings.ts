import type { Settings } from "../settings/Settings";
import type { Audio } from "./Audio";

/**
 * Keep the audio master volume in sync with the `volume` setting. Applies the
 * current value immediately, then tracks changes. Returns a disposer that
 * detaches the subscription.
 *
 * This is an audio↔settings concern, kept out of the Engine bootstrap — the
 * Engine just wires it up and owns the disposer's lifetime.
 */
export function bindAudioToSettings(audio: Audio, settings: Settings): () => void {
  audio.setMasterVolume(settings.get().volume);
  return settings.events.on("onSettingChanged", (e) => {
    if (e.key === "volume") audio.setMasterVolume(settings.get().volume);
  });
}
