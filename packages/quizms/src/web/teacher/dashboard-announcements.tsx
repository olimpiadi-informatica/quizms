import { Fragment } from "react";

import { DateTime } from "@olinfo/react-components";
import { CircleX, Info, TriangleAlert } from "lucide-react";
import Markdown from "react-markdown";

import { useTeacherAnnouncements } from "./context";

export function Announcements() {
  const announcements = useTeacherAnnouncements();

  return (
    <div className="prose max-w-none">
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
      {announcements.length === 0 && <div>Nessuna comunicazione.</div>}
    </div>
  );
}
