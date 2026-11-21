import { Fragment, type RefObject, useReducer, useRef } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Announcement } from "@olinfo/quizms/models";
import {
  Button,
  CardActions,
  DateTime,
  Form,
  Modal,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@olinfo/react-components";
import { CircleX, Info, TriangleAlert } from "lucide-react";
import Markdown from "react-markdown";

import { adminCreateAnnouncement } from "~/web/common/api";
import { announcementConverter } from "~/web/common/converters";
import { useCollection } from "~/web/hooks";

import { useAdmin } from "./context";

export default function Announcements() {
  const { i18n } = useLingui();
  const { contest } = useAdmin();
  const ref = useRef<HTMLDialogElement>(null);

  const [announcements] = useCollection("announcements", announcementConverter, {
    arrayConstraints: {
      contestIds: contest.id,
    },
    orderBy: ["createdAt", "desc"],
  });

  return (
    <>
      <div className="prose mt-4 max-w-none">
        {announcements.map((announcement) => (
          <Fragment key={announcement.id}>
            <h4 className="flex items-center gap-3">
              {announcement.level === "info" && <Info size={20} className="text-info" />}
              {announcement.level === "warning" && (
                <TriangleAlert size={20} className="text-warning" />
              )}
              {announcement.level === "error" && <CircleX size={20} className="text-error" />}
              {announcement.title}
            </h4>
            <small>
              <DateTime date={announcement.createdAt} locale={i18n.locale} />
            </small>
            <Markdown>{announcement.body}</Markdown>
            <hr className="my-5 last:hidden" />
          </Fragment>
        ))}
      </div>
      <CardActions>
        <Button className="btn-primary" onClick={() => ref.current?.showModal()}>
          <Trans>Add announcement</Trans>
        </Button>
      </CardActions>
      <AnnouncementModal ref={ref} />
    </>
  );
}

function AnnouncementModal({ ref }: { ref: RefObject<HTMLDialogElement | null> }) {
  const { t } = useLingui();
  const { contest, user } = useAdmin();
  const [id, nextId] = useReducer((prev) => prev + 1, 0);

  const finalize = async ({
    level,
    title,
    body,
  }: Pick<Announcement, "level" | "title" | "body">) => {
    try {
      await adminCreateAnnouncement(user, {
        contestId: contest.id,
        level,
        title,
        body,
      });
      nextId();
    } finally {
      ref.current?.close();
    }
  };

  return (
    <Modal ref={ref} title={t`Add announcement`}>
      <Form key={id} onSubmit={finalize} className="!max-w-full">
        <SelectField
          field="level"
          label={t`Priority`}
          options={{ info: t`Normal`, warning: t`High` }}
          placeholder={t`Select the priority`}
        />
        <TextField field="title" label={t`Title`} placeholder={t`Enter the title`} />
        <TextAreaField
          field="body"
          label={t`Message`}
          placeholder={t`Enter the message`}
          rows={5}
        />
        <SubmitButton>
          <Trans>Add</Trans>
        </SubmitButton>
      </Form>
    </Modal>
  );
}
