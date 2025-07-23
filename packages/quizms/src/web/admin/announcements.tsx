import { Fragment, forwardRef, type Ref, useReducer, useRef } from "react";

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

import { useAdmin } from "./provider";

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
          Aggiungi comunicazione
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
    <Modal ref={ref} title="Aggiungi comunicazione">
      <Form key={id} onSubmit={finalize} className="!max-w-full">
        <SelectField
          field="level"
          label="Priorità"
          options={{ info: "Normale", warning: "Alta" }}
          placeholder="Seleziona la priorità"
        />
        <TextField field="title" label="Titolo" placeholder="Inserisci il titolo" />
        <TextAreaField
          field="body"
          label="Messaggio"
          placeholder="Inserisci il messaggio"
          rows={5}
        />
        <SubmitButton>Aggiungi</SubmitButton>
      </Form>
    </Modal>
  );
});
