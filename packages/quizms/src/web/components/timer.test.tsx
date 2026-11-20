// @vitest-environment happy-dom
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Timer } from "./timer";

const now = new Date("2026-03-10T10:00:00Z");

/** Values of the daisyUI countdown segments with their unit suffix, e.g. `["1h", "30m"]`. */
function segments(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>(".countdown > span")].map(
    (span) => `${span.style.getPropertyValue("--value")}${span.nextSibling?.textContent ?? ""}`,
  );
}

describe("Timer", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows hours and minutes when more than an hour is left", () => {
    const { container } = render(<Timer endTime={new Date(now.getTime() + 5_430_000)} />);
    expect(segments(container)).toEqual(["1h", "30m"]);
  });

  it("shows minutes and seconds when less than an hour is left", () => {
    const { container } = render(<Timer endTime={new Date(now.getTime() + 125_000)} />);
    expect(segments(container)).toEqual(["2m", "5s"]);
  });

  it("hides minutes on request", () => {
    const { container } = render(<Timer endTime={new Date(now.getTime() + 9_000)} hideMinutes />);
    expect(segments(container)).toEqual(["9s"]);
  });

  it("counts down as time passes", () => {
    const { container } = render(<Timer endTime={new Date(now.getTime() + 61_000)} />);
    expect(segments(container)).toEqual(["1m", "1s"]);

    act(() => vi.advanceTimersByTime(2_000));
    expect(segments(container)).toEqual(["0m", "59s"]);

    act(() => vi.advanceTimersByTime(59_000));
    expect(segments(container)).toEqual(["0m", "0s"]);
  });

  it("never goes below zero and stops ticking after the end", () => {
    const { container } = render(<Timer endTime={new Date(now.getTime() + 1_000)} />);
    act(() => vi.advanceTimersByTime(10_000));
    expect(segments(container)).toEqual(["0m", "0s"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shows zero for an end time in the past", () => {
    const { container } = render(<Timer endTime={new Date(now.getTime() - 3_600_000)} />);
    expect(segments(container)).toEqual(["0m", "0s"]);
  });

  it("restarts when the end time changes", () => {
    const { container, rerender } = render(<Timer endTime={new Date(now.getTime() + 10_000)} />);
    rerender(<Timer endTime={new Date(now.getTime() + 7_200_000)} />);
    act(() => vi.advanceTimersByTime(200));
    expect(segments(container)).toEqual(["1h", "59m"]);
  });

  it("clears its interval on unmount", () => {
    const { unmount } = render(<Timer endTime={new Date(now.getTime() + 60_000)} />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
