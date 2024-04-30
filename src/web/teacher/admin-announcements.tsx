import { Fragment } from "react";

import { AlertTriangle, Info, XCircle } from "lucide-react";

import { formatDate, formatTime } from "~/utils/date";
import { announcementConverter } from "~/web/firebase/converters";
import { useCollection } from "~/web/firebase/hooks";

import { useTeacher } from "./provider";

export function Announcements() {
  const { contest } = useTeacher();

  const [announcements] = useCollection("announcements", announcementConverter, {
    arrayConstraints: {
      contestIds: contest.id,
    },
    orderBy: ["createdAt", "desc"],
    subscribe: true,
  });

  return (
    <>
      {announcements.length === 0 && <div>Nessuna comunicazione.</div>}
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
              {formatDate(announcement.createdAt)}, {formatTime(announcement.createdAt)}
            </small>
            <p>{announcement.body}</p>
            <hr className="my-5 last:hidden" />
          </Fragment>
        ))}
      </div>
    </>
  );
}
