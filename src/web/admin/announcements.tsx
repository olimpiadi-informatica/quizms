import { ChangeEvent, Fragment, Ref, forwardRef, useRef, useState } from "react";

import { DateTime } from "@olinfo/react-components";
import { AlertTriangle, Info, XCircle } from "lucide-react";

import { Button, Buttons, Modal } from "~/components";
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
      <Buttons>
        <Button className="btn-error" onClick={() => ref.current?.showModal()}>
          Aggiungi comunicazione
        </Button>
        <AnnouncementModal ref={ref} addAnnouncement={addAnnouncement} />
      </Buttons>
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
    </>
  );
}

const AnnouncementModal = forwardRef(function AnnouncementModal(
  { addAnnouncement }: { addAnnouncement: (announcement: Announcement) => Promise<void> },
  ref: Ref<HTMLDialogElement>,
) {
  const { contest } = useAdmin();

  const defaultAnnouncement = (): Announcement => ({
    id: randomId(),
    createdAt: new Date(),
    contestIds: [contest.id],
    level: "info",
    title: "",
    body: "",
  });

  const [announcement, setAnnouncement] = useState<Announcement>(defaultAnnouncement);

  const setValue =
    (key: keyof Announcement) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setAnnouncement((prev) => ({ ...prev, [key]: e.target.value }));

  const finalize = async () => {
    setAnnouncement(defaultAnnouncement);
    await addAnnouncement(announcement as Announcement);
    if (ref && "current" in ref) {
      ref.current?.close();
    }
  };

  return (
    <Modal ref={ref} title="Aggiungi comunicazione">
      <div className="flex flex-col gap-3">
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">Priorità</span>
          </div>
          <select
            name="priority"
            className="select select-bordered"
            value={announcement.level}
            onChange={setValue("level")}>
            <option value="info">Normale</option>
            <option value="warning">Alta</option>
          </select>
        </label>

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">Titolo</span>
          </div>
          <input
            name="title"
            type="text"
            className="input input-bordered"
            value={announcement.title}
            onChange={setValue("title")}
            placeholder="Inserisci il titolo"
          />
        </label>

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">Messaggio</span>
          </div>
          <textarea
            name="body"
            className="textarea textarea-bordered"
            rows={5}
            value={announcement.body}
            onChange={setValue("body")}
            placeholder="Inserisci il messaggio"
          />
        </label>

        <Buttons>
          <Button className="btn-error" onClick={() => finalize()}>
            Aggiungi
          </Button>
        </Buttons>
      </div>
    </Modal>
  );
});
