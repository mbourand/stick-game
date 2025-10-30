import { useMemo, useState } from "react";
import { debounce } from "../../../../../../utils/debounce";

export const SettingSlider = ({
  name,
  min,
  max,
  onChange,
  defaultValue,
}: {
  name: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
  defaultValue: number;
}) => {
  const [value, setValue] = useState(defaultValue);

  const debouncedSetValue = useMemo(
    () =>
      debounce((newValue: number) => {
        onChange(newValue);
      }, 100),
    [onChange],
  );

  const changeValue = (newValue: number) => {
    debouncedSetValue(newValue);
    setValue(newValue);
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-white text-lg text-left">
        {name}: {value}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        className=""
        defaultValue={value}
        onChange={(e) => changeValue(Number(e.target.value))}
      />
    </div>
  );
};
