import { useEffect, useRef, type DetailedHTMLProps, type InputHTMLAttributes } from "react";

export const FolderPicker = (props: DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) => {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    ref?.current?.setAttribute("webkitdirectory", "");
  }, []);

  return <input ref={ref} {...props} />;
};
