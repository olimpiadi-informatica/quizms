import React, { Suspense, useMemo, useState } from "react";

import { useAdmin } from "~/web/admin/provider";
import { participationConverter } from "~/web/firebase/converters";
import { useCollection } from "~/web/firebase/hooks";

export function Admin() {
  const { contest, setContest } = useAdmin();

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="highlight-border card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">Impostazioni gara</h2>
          <TextareaField
            label="Istruzioni gara"
            value={contest.instructions}
            setValue={(instructions) => setContest({ ...contest, instructions })}
          />
        </div>
      </div>
      <div className="highlight-border card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">Statistiche</h2>
          <ContestInformation />
        </div>
      </div>
    </div>
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
        className="textarea textarea-bordered"
        value={value ?? ""}
        onChange={(e) => setValue(e.target.value)}
        readOnly={!editable}
        rows={10}
      />
    </label>
  );
}

function ContestInformation() {
  const { contest } = useAdmin();

  const [schools] = useCollection("participations", participationConverter, {
    constraints: {
      contestId: contest.id,
    },
  });

  const finalizedSchools = useMemo(() => schools.filter((school) => school.finalized), [schools]);

  return (
    <Suspense>
      <div>
        <div>Scuole totali: {schools.length}</div>
        <div>Scuole finalizzate: {finalizedSchools.length}</div>
      </div>
    </Suspense>
  );
}
