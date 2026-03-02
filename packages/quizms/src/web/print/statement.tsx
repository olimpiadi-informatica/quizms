import { useStudent } from "~/web/student";
import { RemoteStatement } from "~/web/student/remote-statement";

export function PrintStatement() {
  const { student } = useStudent();

  return (
    <RemoteStatement
      statementUrl={() =>
        `/print-proxy/files/${student.contestId}/${student.variantId}/statement.txt`
      }
      moduleUrl={(id) => `/print-proxy/files/${student.contestId}/${student.variantId}/${id}`}
    />
  );
}
PrintStatement.displayName = "PrintStatement";
