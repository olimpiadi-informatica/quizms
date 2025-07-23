import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { BaseLayout } from "./layout";

export function createApp(entry: ReactNode) {
  const container = document.getElementById("app");
  if (!container) {
    throw new Error('Missing <div id="app"> in index.html');
  }

  createRoot(container).render(<BaseLayout>{entry}</BaseLayout>);
}
