import { createContext, useContext, useEffect } from "react";
import { useCookies } from "react-cookie";
import urlJoin from "url-join";
import useSWR from "swr";
import {
  contestConverter,
  participationConverter,
  studentConverter,
} from "./converters";
import { Answer } from "~/models";
import { UserAnswer } from "../quizms-backend/bindings/UserAnswer";

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
) {
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

  const { data, error, ...oth } = useCall(
    Cookies.token ? ["/contestant/status", Cookies.token] : null,
    studentConverter,
  );

  useEffect(() => {
    if (error) {
      removeCookie("token");
    }
  }, [error]);

  return { student: data, error, ...oth };
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
  answers: { [key in string]: Answer },
) {
  const toUserAnswer = (answer: string | number): UserAnswer => {
    if (typeof answer === "number") {
      return { number: answer };
    } else {
      return { string: answer };
    }
  };

  const userAnswers = Object.fromEntries(
    Object.entries(answers)
      .filter(([k, v], i) => v != null)
      .map(([k, v], i) => [k, v != null && toUserAnswer(v)]),
  );
  return await fetch(urlJoin(apiUrl, "/contestant/set_answers"), {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userAnswers),
  });
}
