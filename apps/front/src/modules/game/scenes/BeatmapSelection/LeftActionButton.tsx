import { RadialButton } from "../shared/RadialButton";
import {
  BUTTON_HEIGHT_PX,
  BUTTON_WIDTH_PX,
  CIRCLE_RADIUS_PX,
  computeLeftRadialLayout,
} from "./layout";

type LeftActionButtonProps = {
  yCenter: number;
  label: string;
  isFocused: boolean;
  onFocus: () => void;
  onClick: () => void;
};

export const LeftActionButton = ({
  yCenter,
  label,
  isFocused,
  onFocus,
  onClick,
}: LeftActionButtonProps) => {
  const layout = computeLeftRadialLayout(yCenter, CIRCLE_RADIUS_PX);
  return (
    <RadialButton
      side="left"
      top={layout.top}
      left={layout.left}
      outerWidth={layout.outerWidth}
      buttonWidth={BUTTON_WIDTH_PX}
      buttonHeight={BUTTON_HEIGHT_PX}
      paddingNear={layout.paddingRight}
      mask={layout.mask}
      isFocused={isFocused}
      onFocus={onFocus}
      onClick={onClick}
      innerClassName="text-sm font-semibold uppercase tracking-[0.25em] justify-end"
    >
      {label}
    </RadialButton>
  );
};
