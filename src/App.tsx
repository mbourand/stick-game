import { GameCanvas } from "./modules/game/components/GameCanvas";
import "./modules/fonts/constants";
import { useEffect, useState } from "react";
import { GamepadMapping } from "./modules/gamepad/mapping/GamepadMapping";
import { Settings } from "./modules/settings/Settings";

function App() {
  const [wasMappingDone, setWasMappingDone] = useState<boolean>(false);
  const [isGamepadMappingVisible, setIsGamepadMappingVisible] = useState<boolean>(false);

  useEffect(() => {
    if (wasMappingDone) return;

    const intervalId = setInterval(() => {
      const gamepad = navigator.getGamepads()[0];
      if (!gamepad) return;

      if (gamepad.mapping === "standard") {
        setWasMappingDone(true);
        return;
      }

      console.warn("Non-standard gamepad detected. Please configure your gamepad mapping.");
      setIsGamepadMappingVisible(true);
    }, 200);

    return () => clearInterval(intervalId);
  }, [wasMappingDone]);

  return (
    <div>
      <div className="absolute top-0 left-0 -z-1">
        <GameCanvas />
      </div>
      {isGamepadMappingVisible && (
        <GamepadMapping
          onCompleted={(mapping) => {
            setIsGamepadMappingVisible(false);
            setWasMappingDone(true);
            Settings.set("gamepadMapping", mapping);
          }}
        />
      )}
    </div>
  );
}

export default App;
