import { createApp } from "@olinfo/quizms/entry";

import { BlocklyEditor } from "./editor";

export default function createEditorEntry() {
  return createApp(<BlocklyEditor />);
}
