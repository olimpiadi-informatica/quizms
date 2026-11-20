import { createContext, useContext } from "react";

import { RemoteStatement, useStudent } from "@olinfo/quizms/student";
import { contestStatementFile } from "@olinfo/quizms/utils";
import { Button } from "@olinfo/react-components";

export const TrainingStatementContext = createContext<{
  start?: () => Promise<void> | void;
}>({});

export function TrainingStatement() {
  const { student, contest, language } = useStudent();
  const { start } = useContext(TrainingStatementContext);

  if (!student.participationWindow) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center">
        <Button className="btn-success btn-lg" onClick={start}>
          Inizia
        </Button>
      </div>
    );
  }

  return (
    <RemoteStatement
      statementUrl={() =>
        `/variants/${contest.id}/${student.variantId}/${contestStatementFile(contest.languages, language)}`
      }
      moduleUrl={(id) => `/variants/${contest.id}/${student.variantId}/${id}`}
    />
  );
}
