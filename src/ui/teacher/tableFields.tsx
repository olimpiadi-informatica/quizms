import React, { ChangeEvent } from "react";

import classNames from "classnames";
import { formatISO } from "date-fns";
import { isDate } from "lodash-es";

type FieldValue = string | number | Date | undefined;

type BaseFieldProps<T> = {
  name: string;
  type: "text" | "number" | "date";
  label: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  data: T;
  setData: (value: T) => void;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: Parameters<typeof classNames>[0];
};

export function TableField<T extends Record<string, any>>({
  name,
  type,
  label,
  min,
  max,
  size,
  disabled,
  data,
  setData,
  className,
}: BaseFieldProps<T>) {
  const rawValue: FieldValue = data[name] ?? "";
  const value = isDate(rawValue) ? formatISO(rawValue, { representation: "date" }) : rawValue;

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    let val: FieldValue = e.target.value;
    if (val === "") {
      val = undefined;
    } else if (type === "date") {
      val = new Date(val);
    } else if (type === "number") {
      const num = Number(val);
      if ((min ?? -Infinity) <= num && num <= (max ?? Infinity)) {
        val = num;
      } else {
        return;
      }
    }
    setData({ ...data, [name]: val });
  };

  const widths = {
    xs: "w-10",
    sm: "w-16",
    md: "w-20",
    lg: "w-24",
    xl: "w-28",
  };

  return (
    <td className="px-0.5">
      <div className="flex justify-center">
        <input
          name={name}
          className={classNames("input input-ghost input-xs", size && widths[size], className)}
          type={type === "number" ? "text" : type}
          placeholder={size !== "xs" ? label : undefined}
          value={value}
          onChange={onChange}
          disabled={disabled}
          min={min}
          max={max}
          autoComplete="off"
        />
      </div>
    </td>
  );
}

type BooleanFieldProps<T> = Omit<BaseFieldProps<T>, "type" | "min" | "max" | "label">;

export function TableBooleanField<T extends Record<string, any>>({
  name,
  disabled,
  data,
  setData,
  className,
}: BooleanFieldProps<T>) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [name]: e.target.checked });
  };

  return (
    <td>
      <div className="flex justify-center">
        <input
          className={classNames("checkbox", className)}
          type="checkbox"
          checked={data[name] ?? false}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    </td>
  );
}
