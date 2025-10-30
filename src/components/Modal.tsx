import type { ReactNode } from "react";
import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../modules/game/utils/constants";

type ModalProps = {
  isVisible: boolean;
  children: ReactNode;
  close: () => void;
};

export const Modal = ({ isVisible, children, close }: ModalProps) => {
  if (!isVisible) return null;

  return (
    <>
      <div
        role="button"
        className="fixed bg-black/80 w-full h-full top-0 left-0 z-50 flex flex-col items-center justify-center"
        onClick={close}
      />
      <div className="fixed top-1/2 left-1/2 -translate-1/2 z-51">
        <div
          className="relative p-4 bg-black rounded-full aspect-square flex flex-col items-center justify-center text-white outline-10 outline-white"
          style={{ minHeight: GAME_CIRCLE_DISPLAYED_RADIUS * 2, minWidth: GAME_CIRCLE_DISPLAYED_RADIUS * 2 }}
        >
          {children}
        </div>
      </div>
    </>
  );
};
