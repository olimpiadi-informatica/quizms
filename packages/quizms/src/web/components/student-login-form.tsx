import {
  Form,
  Navbar,
  NavbarBrand,
  SelectField,
  SubmitButton,
  TextField,
} from "@olinfo/react-components";
import { mapValues } from "lodash-es";

import type { Contest, Student } from "~/models";
import { UserDataField } from "~/web/student/user-data-form";
import { useMetadata } from "./page";

export type FormStudent = {
  contestId: string;
  token: string;
} & Student["userData"];

function NavbarTitle({ title }: { title: string }) {
  return (
    <Navbar color="bg-base-300 text-base-content">
      <NavbarBrand>
        <div className="flex items-center h-full font-bold">{title}</div>
      </NavbarBrand>
    </Navbar>
  );
}

export function StudentDataLoginForm({
  contests,
  onSubmit,
}: {
  contests: Contest[];
  onSubmit: ({ contestId, token, ...userData }: FormStudent) => Promise<void>;
}) {
  const defaultValue = {
    contestId: Object.keys(contests).length === 1 ? Object.keys(contests)[0] : undefined,
  };
  const contestsMap = Object.fromEntries(contests.map((contest) => [contest.id, contest]));
  const metadata = useMetadata();
  return (
    <>
      <NavbarTitle title={metadata.title ?? ""} />
      <Form defaultValue={defaultValue} onSubmit={onSubmit} className="p-4 pb-8">
        <h1 className="mb-2 text-xl font-bold">Accedi alla gara</h1>
        <SelectField
          field="contestId"
          label="Gara"
          options={mapValues(contests, "name")}
          placeholder="Seleziona una gara"
        />
        {({ contestId }) => {
          const contest = contestsMap[contestId ?? ""];
          if (!contest) return;
          return (
            <>
              {contest.userData.map((field) => (
                <UserDataField key={field.name} field={field} />
              ))}
              <TextField field="token" label="Codice prova" placeholder="aaaaa-bbbbb-ccccc" />
              <SubmitButton>Inizia la prova</SubmitButton>
            </>
          );
        }}
      </Form>
    </>
  );
}

export function StudentTokenLoginForm({
  onSubmit,
}: {
  onSubmit: ({ token }: { token: string }) => void | Promise<void>;
}) {
  const metadata = useMetadata();
  return (
    <>
      <NavbarTitle title={metadata.title ?? ""} />
      <Form onSubmit={onSubmit}>
        <TextField field="token" label="Codice utente" placeholder="aaaaa-bbbbb-ccccc" />
        <SubmitButton>Inizia la prova</SubmitButton>
      </Form>
    </>
  );
}
