import { type ReactNode, createContext, useCallback, useContext } from "react";
import { CookiesProvider, useCookies } from "react-cookie";
import useSWR from "swr";
import { StudentTokenLoginForm } from "../components/student-login-form";

type LoginProps = {
  apiUrl: string;
  children: ReactNode;
};

type RestContextProps = {
  apiUrl: string;
};

const RestContext = createContext<RestContextProps | null>(null);

const useRest = () => {
  return useContext(RestContext);
};

export function ApiStudentLogin({ children, apiUrl }: LoginProps) {
  return (
    <CookiesProvider>
      <RestContext.Provider value={{ apiUrl }}>
        <StudentLoginInner>{children}</StudentLoginInner>
      </RestContext.Provider>
    </CookiesProvider>
  );
}

function StudentLoginInner({ children }: { children: ReactNode }) {
  const [Cookies, setCookie, removeCookie] = useCookies(["token"]);
  const api = useRest();

  const fetcher = useCallback(
    async ([url, token]: [string, string]) => {
      if (token) {
        const res = await fetch(url, {
          credentials: "include",
        });
        if (res.status === 403) {
          removeCookie("token", { path: "/" });
          throw new Error("Token errato");
        }
        return await res.json();
      }
    },
    [removeCookie],
  );

  const {
    data: student,
    isLoading,
    mutate,
  } = useSWR([`${api?.apiUrl}/status`, Cookies.token], fetcher);

  const submit = useCallback(
    ({ token }: { token: string }) => {
      setCookie("token", token, { path: "/" });
      mutate();
    },
    [setCookie, mutate],
  );

  if (Cookies.token && !isLoading && student) {
    return <StudentInner student={student}>{children}</StudentInner>;
  }

  return <StudentTokenLoginForm onSubmit={submit} />;
}

function StudentInner({ student, children }: { student: object; children: ReactNode }) {
  console.log(student);
  return <>{children}</>;
}
