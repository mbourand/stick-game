import { useEffect, useRef, useState } from "react";
import { Modal } from "../../../components/Modal";
import {
  GamepadAxisKind,
  GamepadAxisMappingType,
  GamepadButtonKind,
  GamepadButtonMappingType,
  GamepadMappingType,
} from "./types";

const detectMovedAxis = (threshold: number, expectNegative: boolean): { index: number; inverted: boolean } | null => {
  const gamepad = navigator.getGamepads()[0];

  if (gamepad) {
    for (let i = 0; i < gamepad.axes.length; i++) {
      const value = gamepad.axes[i];
      if (Math.abs(value) > threshold && Math.abs(value) <= 1.1) {
        return { index: i, inverted: expectNegative ? value > 0 : value < 0 };
      }
    }
  }

  return null;
};

const detectPressedButton = (): { index: number } | null => {
  const gamepad = navigator.getGamepads()[0];
  const pressedIndex = gamepad?.buttons.findIndex((button) => button.pressed);

  return pressedIndex == null ? null : { index: pressedIndex };
};

type GamepadMappingProps = {
  onCompleted: (mapping: GamepadMappingType) => void;
};

export const GamepadMapping = ({ onCompleted }: GamepadMappingProps) => {
  const detectedAxis = useRef<Partial<GamepadAxisMappingType>>({});
  const detectedButtons = useRef<Partial<GamepadButtonMappingType>>({});

  const MAPPING_STEPS = [
    {
      category: "Left Stick",
      description: "Move the left stick up",
      update: () => {
        const movedAxis = detectMovedAxis(0.75, true);
        const wasAlreadyMapped = Object.values(detectedAxis.current || {}).some(
          (mapped) => mapped.index === movedAxis?.index,
        );
        if (!movedAxis || wasAlreadyMapped) return false;

        detectedAxis.current = {
          ...detectedAxis.current,
          [GamepadAxisKind.LeftStickY]: { ...movedAxis, kind: GamepadAxisKind.LeftStickY },
        };
        return true;
      },
    },
    {
      category: "Left Stick",
      description: "Move the left stick left",
      update: () => {
        const movedAxis = detectMovedAxis(0.75, true);
        const wasAlreadyMapped = Object.values(detectedAxis.current || {}).some(
          (mapped) => mapped.index === movedAxis?.index,
        );
        if (!movedAxis || wasAlreadyMapped) return false;

        detectedAxis.current = {
          ...detectedAxis.current,
          [GamepadAxisKind.LeftStickX]: { ...movedAxis, kind: GamepadAxisKind.LeftStickX },
        };
        return true;
      },
    },
    {
      category: "Right Stick",
      description: "Move the right stick up",
      update: () => {
        const movedAxis = detectMovedAxis(0.75, true);
        const wasAlreadyMapped = Object.values(detectedAxis.current || {}).some(
          (mapped) => mapped.index === movedAxis?.index,
        );
        if (!movedAxis || wasAlreadyMapped) return false;

        detectedAxis.current = {
          ...detectedAxis.current,
          [GamepadAxisKind.RightStickY]: { ...movedAxis, kind: GamepadAxisKind.RightStickY },
        };
        return true;
      },
    },
    {
      category: "Right Stick",
      description: "Move the right stick left",
      update: () => {
        const movedAxis = detectMovedAxis(0.75, true);
        const wasAlreadyMapped = Object.values(detectedAxis.current || {}).some(
          (mapped) => mapped.index === movedAxis?.index,
        );
        if (!movedAxis || wasAlreadyMapped) return false;

        detectedAxis.current = {
          ...detectedAxis.current,
          [GamepadAxisKind.RightStickX]: { ...movedAxis, kind: GamepadAxisKind.RightStickX },
        };
        return true;
      },
    },
    {
      category: "Buttons",
      description: "Press your left stick",
      update: () => {
        const pressedButton = detectPressedButton();
        const wasAlreadyMapped = Object.values(detectedButtons.current || {}).some(
          (mapped) => mapped.index === pressedButton?.index,
        );
        if (!pressedButton || wasAlreadyMapped) return false;

        detectedButtons.current = {
          ...detectedButtons.current,
          [GamepadButtonKind.LeftStickClick]: { ...pressedButton, kind: GamepadButtonKind.LeftStickClick },
        };

        return true;
      },
    },
    {
      category: "Buttons",
      description: "Press your right stick",
      update: () => {
        const pressedButton = detectPressedButton();
        const wasAlreadyMapped = Object.values(detectedButtons.current || {}).some(
          (mapped) => mapped.index === pressedButton?.index,
        );
        if (!pressedButton || wasAlreadyMapped) return false;

        detectedButtons.current = {
          ...detectedButtons.current,
          [GamepadButtonKind.RightStickClick]: { ...pressedButton, kind: GamepadButtonKind.RightStickClick },
        };

        return true;
      },
    },
  ];

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = MAPPING_STEPS[currentStepIndex];

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (currentStep.update()) {
        setCurrentStepIndex((prev) => Math.min(prev + 1, MAPPING_STEPS.length - 1));
        if (currentStepIndex === MAPPING_STEPS.length - 1) {
          onCompleted({
            axisMapping: detectedAxis.current as GamepadAxisMappingType,
            buttonMapping: detectedButtons.current as GamepadButtonMappingType,
          });
          return;
        }
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [MAPPING_STEPS.length, currentStep, currentStepIndex, detectedAxis, onCompleted]);

  return (
    <Modal isVisible={true}>
      <p>
        {currentStepIndex + 1} / {MAPPING_STEPS.length}
      </p>
      <div className="flex flex-col justify-between h-full items-center p-16 text-lg">
        <h2 className="font-bold text-lg">{currentStep.category}</h2>
        <p className="">{currentStep.description}</p>
      </div>
    </Modal>
  );
};
