import { createContext, useContext, useEffect } from "react";
import { useCookies } from "react-cookie";
import useSWR from "swr";
import urlJoin from "url-join";
import type { Answer } from "~/models";
import {
  answersToRest,
  contestConverter,
  participationConverter,
  studentConverter,
} from "./converters";

type RestContextProps = {
  apiUrl: string;
};

export const RestContext = createContext<RestContextProps | null>(null);

export const useRest = () => {
  return useContext(RestContext);
};

function useCall(keys: [string, ...any[]] | null, converter: (data: any) => any = (data) => data) {
  const { apiUrl } = useRest()!;
  const res = useSWR(keys, async ([path]) => {
    const res = await fetch(urlJoin(apiUrl, path), {
      credentials: "same-origin",
    });
    return converter(await res.json());
  });
  return res;
}

export function useGetStatus() {
  const [Cookies, , removeCookie] = useCookies(["token"]);

  const { data, error, isLoading, ...oth } = useCall(
    Cookies.token ? ["/contestant/status", Cookies.token] : null,
    studentConverter,
  );

  useEffect(() => {
    if (!isLoading && error) {
      removeCookie("token");
    }
  }, [error, isLoading, removeCookie]);

  return { student: data, isLoading, error, ...oth };
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
