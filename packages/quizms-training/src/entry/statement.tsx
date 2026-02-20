import { createContext, useContext } from "react";

import { RemoteStatement, useStudent } from "@olinfo/quizms/student";
import { Button } from "@olinfo/react-components";

export const TrainingStatementContext = createContext<{
  start?: () => Promise<void> | void;
}>({});

export function TrainingStatement() {
  const { student, contest } = useStudent();
  const { start } = useContext(TrainingStatementContext);

  if (!student.startedAt) {
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
      statementUrl={() => `/variants/${contest.id}/${student.variant}/statement.txt`}
      moduleUrl={(id) => `/variants/${contest.id}/${student.variant}/${id}`}
    />
  );
}
