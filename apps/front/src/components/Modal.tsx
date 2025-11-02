import type { ReactNode } from "react";
import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../modules/game/utils/constants";

type ModalProps = {
  isVisible: boolean;
  children: ReactNode;
  onClose: () => void;
  rounded?: boolean;
};

export const Modal = ({ isVisible, children, onClose, rounded = true }: ModalProps) => {
  if (!isVisible) return null;

  return (
    <>
      <div
        className="fixed bg-black/80 w-full h-full top-0 left-0 z-50 flex flex-col items-center justify-center"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[51]">
        <div
          className={`relative p-4 bg-black aspect-square flex flex-col items-center justify-center text-white outline-[10px] outline-white ${
            rounded ? "rounded-full" : "rounded-lg"
          }`}
          style={{ minHeight: GAME_CIRCLE_DISPLAYED_RADIUS * 2, minWidth: GAME_CIRCLE_DISPLAYED_RADIUS * 2 }}
        >
          {children}
        </div>
      </div>
    </>
  );
};
