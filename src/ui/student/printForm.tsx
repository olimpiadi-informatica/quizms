import React from "react";

import { Contest } from "~/models/contest";

export function PrintForm({ contest, variant }: { contest: Contest; variant: number | string }) {
  return (
    <div className="grid grid-cols-2 gap-2 pb-10">
      {contest.personalInformation.map((field) => (
        <div key={field.name} className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">{field.label}</span>
          </label>
          <input type="text" className="input input-bordered w-full max-w-md" />
        </div>
      ))}
      {contest.hasVariants && (
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">Variante</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full max-w-md"
            value={variant}
            readOnly
          />
        </div>
      )}
    </div>
  );
}
