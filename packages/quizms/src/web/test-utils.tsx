// Fixtures and wrappers shared by the component tests. Not part of the library build (it is only
// imported by `*.test.tsx` files).
import { type ComponentProps, type ReactNode, Suspense } from "react";

import { act, render, screen, waitFor } from "@testing-library/react";

import type { Contest, Schema, Student, Venue } from "~/models";
import { UiLanguageProvider } from "~/web/components/ui-language-provider";
import { StudentProvider } from "~/web/student/provider";

export function makeContest(overrides: Partial<Contest> = {}): Contest {
  return {
    id: "demo",
    name: "Demo",
    longName: "Gara di prova",
    problemIds: ["1", "2", "3", "4"],
    userData: [
      {
        name: "name",
        label: "Nome",
        type: "text",
        pattern: ".*",
        patternMismatch: "",
        patternHelp: "",
        title: false,
      },
      {
        name: "surname",
        label: "Cognome",
        type: "text",
        pattern: ".*",
        patternMismatch: "",
        patternHelp: "",
        title: false,
      },
    ],
    matchingRules: [],
    hasVariants: true,
    onlineSettings: null,
    hasOffline: false,
    allowStudentImport: true,
    allowStudentEdit: true,
    allowAnswerEdit: true,
    allowStudentDelete: true,
    scoreVisibility: "always",
    languages: ["it"],
    ...overrides,
  };
}

export function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: "student-1",
    uid: "uid-1",
    contestId: "demo",
    variantId: "101",
    userData: { name: "Ada", surname: "Lovelace" },
    answers: {},
    ...overrides,
  };
}

export function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: "venue-1",
    schoolId: "school-1",
    contestId: "demo",
    name: "Liceo",
    finalized: false,
    pdfVariants: [],
    disabled: false,
    ...overrides,
  };
}

export const schema: Schema = {
  "1": {
    type: "multipleChoice",
    originalId: "1",
    pointsCorrect: 5,
    pointsBlank: 1,
    pointsWrong: 0,
    options: [
      { id: "A", originalId: "B", correct: false },
      { id: "B", originalId: "A", correct: true },
      { id: "C", originalId: "C", correct: false },
    ],
  },
  "2": {
    type: "multipleResponse",
    originalId: "2",
    pointsCorrect: 5,
    pointsBlank: 1,
    pointsWrong: 0,
    options: [
      { id: "A", originalId: "A", correct: true },
      { id: "B", originalId: "B", correct: false },
      { id: "C", originalId: "C", correct: true },
    ],
  },
  "10": {
    type: "openNumber",
    originalId: "10",
    pointsCorrect: 5,
    pointsBlank: 1,
    pointsWrong: 0,
    correct: [42, 43],
  },
  "3": {
    type: "openText",
    originalId: "3",
    pointsCorrect: 5,
    pointsBlank: 1,
    pointsWrong: 0,
    correct: ["ABC"],
  },
};

type ProviderProps = Omit<ComponentProps<typeof StudentProvider>, "children">;

/** Default props of `StudentProvider` (callbacks are no-ops). */
export function studentProviderProps(overrides: Partial<ProviderProps> = {}): ProviderProps {
  return {
    contest: makeContest(),
    student: makeStudent(),
    venue: makeVenue(),
    setAnswer: () => {},
    submit: () => {},
    enforceFullscreen: false,
    ...overrides,
  };
}

/**
 * Suspense boundary for components that suspend (the layout loads the user agent with SWR), with
 * the UI in Italian.
 */
export function TestShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div>test-loading</div>}>
      <UiLanguageProvider language="it">{children}</UiLanguageProvider>
    </Suspense>
  );
}

/**
 * Renders `children` inside a `StudentProvider` (hence inside the student layout), waiting for
 * the layout to finish suspending.
 */
export async function renderInStudentProvider(
  children: ReactNode,
  overrides: Partial<ProviderProps> = {},
): Promise<void> {
  const props = studentProviderProps(overrides);
  await act(() =>
    render(
      <TestShell>
        <StudentProvider {...props}>{children}</StudentProvider>
      </TestShell>,
    ),
  );
  await waitForSuspense();
}

/** Waits until no `TestShell` is showing its Suspense fallback. */
export async function waitForSuspense(): Promise<void> {
  await waitFor(() => {
    if (screen.queryByText("test-loading")) throw new Error("Still suspended");
  });
}
