import { useStudent } from "~/web/student";
import { RemoteStatement } from "~/web/student/remote-statement";

export function PrintStatement({ file }: { file: string }) {
  const { student } = useStudent();

  return (
    <RemoteStatement
      statementUrl={() => `/print-proxy/files/${student.contestId}/${student.variantId}/${file}`}
      moduleUrl={(id) => `/print-proxy/files/${student.contestId}/${student.variantId}/${id}`}
    />
  );
}
PrintStatement.displayName = "PrintStatement";
