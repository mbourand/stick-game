import { forwardRef, useEffect, useRef, type DetailedHTMLProps, type InputHTMLAttributes } from "react";

export const FolderPicker = forwardRef<
  HTMLInputElement,
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
>((props, ref) => {
  const innerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    innerRef?.current?.setAttribute("webkitdirectory", "");
  }, []);

  return (
    <input
      ref={(e) => {
        innerRef.current = e;
        if (typeof ref === "function") {
          ref(e);
        } else if (ref) {
          ref.current = e;
        }
      }}
      {...props}
    />
  );
});
FolderPicker.displayName = "FolderPicker";
