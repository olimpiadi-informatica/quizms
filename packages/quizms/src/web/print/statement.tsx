import { useStudent } from "~/web/student";
import { RemoteStatement } from "~/web/student/remote-statement";

export function PrintStatement() {
  const { student } = useStudent();

  return (
    <RemoteStatement
      statementUrl={() =>
        `/print-proxy/files/${student.contestId}/${student.variant}/statement.txt`
      }
      moduleUrl={(id) => `/print-proxy/files/${student.contestId}/${student.variant}/${id}`}
    />
  );
}
PrintStatement.displayName = "PrintStatement";
