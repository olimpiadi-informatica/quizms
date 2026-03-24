import type { Contest, Student, Venue } from "@olinfo/quizms/models";
import { validate } from "@olinfo/quizms/utils";
import type z from "zod";

import type { Contest as ContestResponse } from "./bindings/Contest";
import type { Student as StudentResponse } from "./bindings/Student";
import type { UserDataField } from "./bindings/UserDataField";
import type { Venue as VenueResponse } from "./bindings/Venue";

type UserData = Contest["userData"][number];

import { cloneDeepWith, isDate } from "lodash-es";


function convertToRest(data: object) {
  return cloneDeepWith(data, (value) => {
    if (isDate(value)) {
      return value.toISOString();
    }
  });
}


function parse<T>(schema: z.core.$ZodType<T>, data: object) {
  return validate(schema, data);
}

export function restToUserdata(restUserData: UserDataField): UserData {
  if (restUserData.type === "date") {
    return {
      ...restUserData,
      min: new Date(restUserData.min),
      max: new Date(restUserData.max),
    };
  }
  return restUserData;
}

export function restToStudent(data: StudentResponse): Student {
  return {
    ...data,
    participationWindow: data.participationWindow && {
      start: new Date(data.participationWindow.start),
      end: new Date(data.participationWindow.end),
    },
    createdAt: new Date(data.createdAt),

    score: null,
  };
}

export function restToContest(data: ContestResponse): Contest {
  return {
    ...data,
    userData: data.userData.map(restToUserdata),
    onlineSettings: data.onlineSettings && {
      ...data.onlineSettings,
      contestWindow: {
        start: new Date(data.onlineSettings.contestWindow.end),
        end: new Date(data.onlineSettings.contestWindow.end),
      },
    },
  };
}

export function restToVenue(data: VenueResponse): Venue {
  return {
    ...data,
    participationWindow: data.participationWindow && {
      start: new Date(data.participationWindow.start),
      end: new Date(data.participationWindow.end),
    },
  };
}
