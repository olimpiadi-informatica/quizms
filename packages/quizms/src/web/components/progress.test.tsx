// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Progress } from "./progress";

function progressValue() {
  const bar = document.querySelector("progress")!;
  return bar.hasAttribute("value") ? Number(bar.getAttribute("value")) : undefined;
}

describe("Progress", () => {
  it("renders its children", () => {
    render(<Progress percentage={40}>40%</Progress>);
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(progressValue()).toBe(40);
  });

  it("rounds the percentage", () => {
    render(<Progress percentage={33.6}>x</Progress>);
    expect(progressValue()).toBe(34);
  });

  it("clamps the percentage between 0 and 100", () => {
    const { rerender } = render(<Progress percentage={150}>x</Progress>);
    expect(progressValue()).toBe(100);
    rerender(<Progress percentage={-20}>x</Progress>);
    expect(progressValue()).toBe(0);
  });

  it("is indeterminate without a valid percentage", () => {
    const { rerender } = render(<Progress>x</Progress>);
    expect(progressValue()).toBeUndefined();
    rerender(<Progress percentage={Number.NaN}>x</Progress>);
    expect(progressValue()).toBeUndefined();
  });
});
