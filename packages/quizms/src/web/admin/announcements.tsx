import { Fragment, forwardRef, type Ref, useReducer, useRef } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
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

import type { Announcement } from "~/models";
import { randomId } from "~/utils/random";
import { announcementConverter } from "~/web/firebase/common/converters";
import { useCollection } from "~/web/firebase/hooks";

import { useAdmin } from "./context";

export default function Announcements() {
  const { contest } = useAdmin();
  const ref = useRef<HTMLDialogElement>(null);

  const [announcements, addAnnouncement] = useCollection("announcements", announcementConverter, {
    arrayConstraints: {
      contestIds: contest.id,
    },
    orderBy: ["createdAt", "desc"],
    subscribe: true,
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
              <DateTime date={announcement.createdAt} />
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
      <AnnouncementModal ref={ref} addAnnouncement={addAnnouncement} />
    </>
  );
}

const AnnouncementModal = forwardRef(function AnnouncementModal(
  { addAnnouncement }: { addAnnouncement: (announcement: Announcement) => Promise<void> },
  ref: Ref<HTMLDialogElement>,
) {
  const { contest } = useAdmin();
  const { t } = useLingui();
  const [id, nextId] = useReducer((prev) => prev + 1, 0);

  const finalize = async ({
    level,
    title,
    body,
  }: Pick<Announcement, "level" | "title" | "body">) => {
    try {
      await addAnnouncement({
        id: randomId(),
        createdAt: new Date(),
        contestIds: [contest.id],
        level,
        title,
        body,
      });
      nextId();
    } finally {
      if (ref && "current" in ref) {
        ref.current?.close();
      }
    }
  };

  return (
    <Modal ref={ref} title={t`Add announcement`}>
      <Form key={id} onSubmit={finalize} className="!max-w-full">
        <SelectField
          field="level"
          label={t`Priority`}
          options={{ info: t`Normal`, warning: t`High` }}
          placeholder={t`Select priority`}
        />
        <TextField field="title" label={t`Title`} placeholder={t`Enter title`} />
        <TextAreaField field="body" label={t`Message`} placeholder={t`Enter message`} rows={5} />
        <SubmitButton>
          <Trans>Add</Trans>
        </SubmitButton>
      </Form>
    </Modal>
  );
});
