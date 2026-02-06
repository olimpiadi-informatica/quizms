import { RemoteStatement, useStudent } from "@olinfo/quizms/student";
import { Button } from "@olinfo/react-components";
import { addMinutes, subSeconds } from "date-fns";

export function TrainingStatement() {
  const { student, setStudent, contest } = useStudent();

  if (!student.startedAt) {
    const start = async () => {
      const now = new Date();
      await setStudent({
        ...student,
        startedAt: subSeconds(now, 2),
        finishedAt: addMinutes(now, contest.hasOnline ? contest.duration : 0),
      });
    };

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
