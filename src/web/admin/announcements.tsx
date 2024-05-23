import { Fragment, Ref, forwardRef, useRef } from "react";

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
import { AlertTriangle, Info, XCircle } from "lucide-react";

import { Announcement } from "~/models";
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
                <AlertTriangle size={20} className="text-warning" />
              )}
              {announcement.level === "error" && <XCircle size={20} className="text-error" />}
              {announcement.title}
            </h4>
            <small>
              <DateTime date={announcement.createdAt} />
            </small>
            <p>{announcement.body}</p>
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
    } finally {
      if (ref && "current" in ref) {
        ref.current?.close();
      }
    }
  };

  return (
    <Modal ref={ref} title="Aggiungi comunicazione">
      <Form onSubmit={finalize} className="!max-w-full">
        <SelectField
          field="level"
          label="Priorità"
          options={{ info: "Normale", warning: "Alta" }}
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
