import { describe, expect, it } from "vitest";

import {
  getStudentPhase,
  isStudentLocked,
  isStudentTerminated,
  type Student,
} from "~/models/student";

const start = new Date("2030-01-01T10:00:00Z");
const end = new Date("2030-01-01T11:00:00Z");
const before = new Date("2030-01-01T09:00:00Z");
const during = new Date("2030-01-01T10:30:00Z");
const after = new Date("2030-01-01T12:00:00Z");

function student(fields: Partial<Student> = {}): Student {
  return { id: "s1", participationWindow: { start, end }, ...fields };
}

describe("getStudentPhase", () => {
  it("is not started without a participation window", () => {
    expect(getStudentPhase({ participationWindow: undefined }, during)).toBe("not_started");
    expect(getStudentPhase({ participationWindow: undefined, status: "submitted" }, during)).toBe(
      "not_started",
    );
  });

  it("is not started before the window starts", () => {
    expect(getStudentPhase(student(), before)).toBe("not_started");
  });

  it("is ongoing during the window, also for students without a status", () => {
    expect(getStudentPhase(student(), during)).toBe("ongoing");
    expect(getStudentPhase(student({ status: "ongoing" }), during)).toBe("ongoing");
  });

  it("is ongoing exactly at the start and expired exactly at the end", () => {
    expect(getStudentPhase(student(), start)).toBe("ongoing");
    expect(getStudentPhase(student(), end)).toBe("expired");
  });

  it("is submitted after an explicit submission, also after the window ends", () => {
    expect(getStudentPhase(student({ status: "submitted" }), during)).toBe("submitted");
    expect(getStudentPhase(student({ status: "submitted" }), after)).toBe("submitted");
  });

  it("is expired after the window without an explicit submission", () => {
    expect(getStudentPhase(student(), after)).toBe("expired");
    expect(getStudentPhase(student({ status: "ongoing" }), after)).toBe("expired");
  });
});

describe("getStudentPhase with teacher approval", () => {
  it("is pending while the request waits for the teacher", () => {
    expect(getStudentPhase(student({ status: "pending_approval" }), during)).toBe(
      "pending_approval",
    );
  });

  it("is expired when the window ends with a pending request", () => {
    expect(getStudentPhase(student({ status: "pending_approval" }), after)).toBe("expired");
  });

  it("is not started before the window, even with a pending status", () => {
    expect(getStudentPhase(student({ status: "pending_approval" }), before)).toBe("not_started");
  });
});

describe("isStudentLocked", () => {
  it("locks the answers of pending, submitted and expired students", () => {
    expect(isStudentLocked("not_started")).toBe(false);
    expect(isStudentLocked("ongoing")).toBe(false);
    expect(isStudentLocked("pending_approval")).toBe(true);
    expect(isStudentLocked("submitted")).toBe(true);
    expect(isStudentLocked("expired")).toBe(true);
  });
});

describe("isStudentTerminated", () => {
  it("is true only for submitted and expired students", () => {
    expect(isStudentTerminated("not_started")).toBe(false);
    expect(isStudentTerminated("ongoing")).toBe(false);
    expect(isStudentTerminated("pending_approval")).toBe(false);
    expect(isStudentTerminated("submitted")).toBe(true);
    expect(isStudentTerminated("expired")).toBe(true);
  });
});
