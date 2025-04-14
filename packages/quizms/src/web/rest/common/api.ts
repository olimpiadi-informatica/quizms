import { createContext, useContext } from "react";
import { useCookies } from "react-cookie";
import useSWR, { type SWRConfiguration } from "swr";
import urlJoin from "url-join";
import type { Answer } from "~/models";
import {
  answersToRest,
  contestConverter,
  participationConverter,
  studentConverter,
} from "./converters";

class FetchError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "FetchError";
    this.status = status;
  }
}

type RestContextProps = {
  apiUrl: string;
};

export const RestContext = createContext<RestContextProps | null>(null);

export const useRest = () => {
  return useContext(RestContext);
};

function useCall(
  keys: [string, ...any[]] | null,
  converter: (data: any) => any = (data) => data,
  swrConfig: SWRConfiguration | undefined = undefined,
) {
  const { apiUrl } = useRest()!;
  return useSWR(
    keys,
    async ([path]) => {
      const res = await fetch(urlJoin(apiUrl, path), {
        credentials: "same-origin",
      });
      if (!res.ok) {
        throw new FetchError("Network response was not ok", res.status);
      }
      return res.json().then((data) => converter(data));
    },
    swrConfig,
  );
}

export function useGetStatus() {
  const [Cookies, , removeCookie] = useCookies(["token"]);

  const { data, ...oth } = useCall(
    Cookies.token ? ["/contestant/status", Cookies.token] : null,
    studentConverter,
    {
      suspense: true,
      onError: (err) => {
        if (err instanceof FetchError) {
          if (err.status === 403) {
            removeCookie("token");
            throw new Error("Token errato");
          }
        } else {
          throw err;
        }
      },
    },
  );

  return { student: data, ...oth };
}

export function useGetScore() {
  const { data, ...oth } = useCall(["/contestant/score"], (data) => data);
  return { score: data, ...oth };
}

export function useGetContest() {
  const { data, ...oth } = useCall(["/contestant/contest"], contestConverter);
  return { contest: data, ...oth };
}

export function useGetParticipation() {
  const { data, ...oth } = useCall(["/contestant/venue"], participationConverter);
  return { participation: data, ...oth };
}

export async function start(apiUrl: string) {
  return await fetch(urlJoin(apiUrl, "/contestant/start"), {
    method: "POST",
    credentials: "same-origin",
  });
}

export async function setAnswers(
  apiUrl: string,
  {
    answers = undefined,
    code = undefined,
  }: {
    answers?: { [key: string]: Answer };
    code?: { [key: string]: string | undefined };
  },
) {
  const userAnswers = answersToRest(answers, code);
  return await fetch(urlJoin(apiUrl, "/contestant/set_answers"), {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userAnswers),
  });
}
