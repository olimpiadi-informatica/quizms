import { useState } from "react";

import clsx from "clsx";

import { useAdmin } from "./provider";

export default function ContestSettings() {
  const { contest, setContest } = useAdmin();

  return (
    <TextareaField
      label="Istruzioni gara"
      value={contest.instructions}
      setValue={(instructions) => setContest({ ...contest, instructions })}
    />
  );
}

type TextareaFieldProps = {
  label: string;
  value?: string;
  setValue: (value: string) => void;
};

function TextareaField({ label, value, setValue }: TextareaFieldProps) {
  const [editable, setEditable] = useState(false);

  return (
    <label className="form-control">
      <div className="label">
        <span className="label-text">{label}</span>
        <span className="label-text-alt inline-flex items-end gap-2">
          <span>Modifica</span>
          <input
            type="checkbox"
            className="checkbox checkbox-xs"
            checked={editable}
            onChange={(e) => setEditable(e.target.checked)}
          />
        </span>
      </div>
      <textarea
        className={clsx("textarea textarea-bordered", editable && "textarea-warning")}
        value={value ?? ""}
        onChange={(e) => setValue(e.target.value)}
        readOnly={!editable}
        rows={8}
      />
    </label>
  );
}
