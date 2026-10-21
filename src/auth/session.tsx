import { createContext, use, useEffect, useState, type PropsWithChildren } from "react";

import * as api from "@/lib/api";

import { getItem, setItem } from "./storage";

const STORAGE_KEY = "labtrack.session";

type Session = api.LoginResponse;

type SessionContextValue = {
  session: Session | null;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (!value) {
    throw new Error("useSession must be wrapped in a <SessionProvider />");
  }
  return value;
}

function isExpired(session: Session): boolean {
  return new Date(session.expiresAt).getTime() <= Date.now();
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed: Session = JSON.parse(stored);
        if (isExpired(parsed)) {
          setItem(STORAGE_KEY, null);
          return;
        }
        setSession(parsed);
      })
      .catch(() => setItem(STORAGE_KEY, null))
      .finally(() => setIsLoading(false));
  }, []);

  async function signIn(username: string, password: string) {
    const result = await api.login(username, password);
    await setItem(STORAGE_KEY, JSON.stringify(result));
    setSession(result);
  }

  function signOut() {
    setSession(null);
    setItem(STORAGE_KEY, null);
  }

  return (
    <SessionContext value={{ session, isLoading, signIn, signOut }}>{children}</SessionContext>
  );
}
