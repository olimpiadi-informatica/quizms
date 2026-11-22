import { cloneDeepWith } from "lodash-es";

/**
 * Checks whether a value is a Firestore Timestamp, from either the client or the admin SDK.
 *
 * Duck-typed instead of `instanceof Timestamp`, because the snapshot may have been created by a
 * different copy of the SDK. For example, the snapshots passed to Firestore triggers are created
 * by the `firebase-admin` copy used by `firebase-functions`.
 */
export function isTimestamp(value: unknown): value is { toDate(): Date } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as any).toDate === "function" &&
    typeof (value as any).seconds === "number" &&
    typeof (value as any).nanoseconds === "number"
  );
}

/** Deep-clones Firestore data, converting every Timestamp to a Date. */
export function convertFromFirestore(data: object) {
  return cloneDeepWith(data, (value) => {
    if (isTimestamp(value)) {
      return value.toDate();
    }
  });
}
