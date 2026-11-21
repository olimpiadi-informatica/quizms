// Setup for the Vitest suite (see `vitest.config.mjs`). Not part of the library build.
//
// Importing `@testing-library/jest-dom/vitest` registers the DOM matchers (`toBeInTheDocument`,
// ...) and, since this file is under `src/`, also makes their types visible to `tsc`.
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Tell React that updates are wrapped in `act` (Testing Library does it only with Vitest globals).
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  cleanup();
});
