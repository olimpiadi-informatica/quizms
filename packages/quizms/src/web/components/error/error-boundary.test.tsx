// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { useState } from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UiLanguageProvider } from "~/web/components/ui-language-provider";

import { ErrorBoundary } from ".";

const ItalianUi = ({ children }: { children: ReactNode }) => (
  <UiLanguageProvider language="it">{children}</UiLanguageProvider>
);

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error("Boom!");
  return <p>Tutto bene</p>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React logs caught errors
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders its children when nothing fails", () => {
    render(
      <ErrorBoundary>
        <Bomb explode={false} />
      </ErrorBoundary>,
      { wrapper: ItalianUi },
    );
    expect(screen.getByText("Tutto bene")).toBeInTheDocument();
  });

  it("shows the error message instead of the failing children", () => {
    render(
      <ErrorBoundary>
        <Bomb explode />
      </ErrorBoundary>,
      { wrapper: ItalianUi },
    );
    expect(screen.getByText("Errore")).toBeInTheDocument();
    expect(screen.getByText("Boom!")).toBeInTheDocument();
    expect(screen.queryByText("Tutto bene")).not.toBeInTheDocument();
  });

  it("calls onError and recovers on retry", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();

    function Harness() {
      const [explode, setExplode] = useState(true);
      return (
        <ErrorBoundary onError={onError} onReset={() => setExplode(false)}>
          <Bomb explode={explode} />
        </ErrorBoundary>
      );
    }

    render(<Harness />, { wrapper: ItalianUi });
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toHaveProperty("message", "Boom!");

    await user.click(screen.getByRole("button", { name: "Ricarica" }));
    expect(screen.getByText("Tutto bene")).toBeInTheDocument();
  });
});
