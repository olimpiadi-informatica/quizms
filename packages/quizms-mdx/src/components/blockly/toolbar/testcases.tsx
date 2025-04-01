import {} from "react";

import clsx from "clsx";
import { CircleCheck, CircleHelp, CircleX } from "lucide-react";

import type { TestcaseResult } from "~/blockly-types";

type Props = {
  results: (TestcaseResult | undefined)[];
  selectedTestcase: number;
  setSelectedTestcase: (testcase: number) => void;
};

export function TestcaseSelector({ results, selectedTestcase, setSelectedTestcase }: Props) {
  return (
    <>
      <div className="pl-2 text-xl font-bold max-sm:hidden lg:max-xl:hidden">Livello</div>
      <div className="join">
        {results.map((result, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setSelectedTestcase(index)}
            className={clsx(
              "btn join-item z-10 px-3",
              result && "tooltip",
              index === selectedTestcase && "btn-info",
            )}
            data-tip={result?.message}>
            {result?.success === true ? (
              <CircleCheck size={24} className="fill-success stroke-success-content" />
            ) : result?.success === false ? (
              <CircleX size={24} className="fill-error stroke-error-content" />
            ) : (
              <CircleHelp size={24} />
            )}
          </button>
        ))}
      </div>
    </>
  );
}
