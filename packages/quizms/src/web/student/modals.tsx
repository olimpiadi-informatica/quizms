import type { RefObject } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { Form, FormButton, Modal, SubmitButton } from "@olinfo/react-components";
import { sumBy } from "lodash-es";

import { calcProblemPoints, displayAnswer, type Schema } from "~/models";

import { useStudent } from "./context";

export function CompletedModal({ ref }: { ref: RefObject<HTMLDialogElement | null> }) {
  const { t } = useLingui();
  const { schema } = useStudent();

  return (
    <Modal ref={ref} title={t`Test finished`}>
      <p>
        <Trans>The test is over.</Trans>
      </p>
      {schema && <PointsTable schema={schema} />}
    </Modal>
  );
}
CompletedModal.displayName = "CompletedModal";

export function PointsTable({ schema }: { schema: Schema }) {
  const { t } = useLingui();
  const { student } = useStudent();

  const problems = Object.keys(schema);
  problems.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const pointsCorrect = sumBy(Object.values(schema), "pointsCorrect");
  const score = student.score;

  return (
    <>
      <p>
        <Trans>
          You scored <b>{score}</b> out of <b>{pointsCorrect}</b>.
        </Trans>
      </p>
      <table className="table table-sm text-center mt-4">
        <thead>
          <tr>
            <th scope="col">
              <Trans>Question</Trans>
            </th>
            <th scope="col">
              <Trans>Answer</Trans>
            </th>
            <th scope="col">
              <Trans>Solution</Trans>
            </th>
            <th scope="col">
              <Trans>Score</Trans>
            </th>
          </tr>
        </thead>
        <tbody>
          {problems.map((problem) => {
            const answer = student.answers?.[problem];
            const problemSchema = schema[problem];
            return (
              <tr key={problem}>
                <td>{problem}</td>
                <td>{displayAnswer(answer) || "-"}</td>
                <td>{getCorrectOptions(problemSchema, t`or`, t`and`)}</td>
                <td>{calcProblemPoints(problemSchema, answer)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export function SubmitModal({ ref }: { ref: RefObject<HTMLDialogElement | null> }) {
  const { t } = useLingui();
  const { submit, contest } = useStudent();
  const needsApproval = contest.onlineSettings?.terminationMode === "teacher_approval";

  const close = () => {
    ref.current?.close();
  };

  const confirm = async () => {
    try {
      await submit();
      if (ref.current) {
        ref.current.returnValue = "1";
      }
    } finally {
      close();
    }
  };

  return (
    <Modal ref={ref} title={t`Are you sure you want to finish?`}>
      <p>
        {needsApproval ? (
          <Trans>
            Once you confirm, you will no longer be able to change your answers, unless your teacher
            sends the test back to you.
          </Trans>
        ) : (
          <Trans>Once you confirm, you will no longer be able to change your answers.</Trans>
        )}
      </p>
      <Form onSubmit={confirm} className="!max-w-full">
        <div className="flex flex-wrap justify-center gap-2">
          <FormButton onClick={close}>
            <Trans>Cancel</Trans>
          </FormButton>
          <SubmitButton className="btn-error">
            <Trans>Confirm</Trans>
          </SubmitButton>
        </div>
      </Form>
    </Modal>
  );
}
SubmitModal.displayName = "SubmitModal";

function getCorrectOptions(problem: Schema[string], or: string, and: string): string {
  switch (problem.type) {
    case "openNumber":
    case "openText":
      return joinOptions(problem.correct, ` ${or} `);
    case "multipleResponse": {
      const correct = problem.options.filter((option) => option.correct).map((option) => option.id);
      return joinOptions(correct, ` ${and} `);
    }
    case "multipleChoice": {
      const correct = problem.options.filter((option) => option.correct).map((option) => option.id);
      return joinOptions(correct, ` ${or} `);
    }
    case "blockly":
      return "";
  }
}

function joinOptions(options: (string | number)[], sep: string): string {
  const last = options.at(-1);
  const others = options.slice(0, -1);
  return others.join(", ") + (others.length ? sep : "") + last;
}
