"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type AuthCompanionField = "email" | "password" | "code" | "name";

interface AuthCompanionValue {
  focus: AuthCompanionField | null;
  typing: boolean;
  setFocus: (field: AuthCompanionField | null) => void;
  pulseTyping: () => void;
}

const AuthCompanionContext = createContext<AuthCompanionValue | null>(null);

export function AuthCompanionProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState<AuthCompanionField | null>(null);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pulseTyping = useCallback(() => {
    setTyping(true);

    if (typingTimer.current !== null) {
      clearTimeout(typingTimer.current);
    }

    typingTimer.current = setTimeout(() => {
      setTyping(false);
      typingTimer.current = null;
    }, 280);
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimer.current !== null) {
        clearTimeout(typingTimer.current);
      }
    };
  }, []);

  return (
    <AuthCompanionContext.Provider
      value={{ focus, typing, setFocus, pulseTyping }}
    >
      {children}
    </AuthCompanionContext.Provider>
  );
}

export function useAuthCompanion(): AuthCompanionValue {
  const value = useContext(AuthCompanionContext);

  if (value === null) {
    throw new Error(
      "useAuthCompanion must be used within AuthCompanionProvider",
    );
  }

  return value;
}

export function useAuthCompanionField(field: AuthCompanionField) {
  const { setFocus, pulseTyping } = useAuthCompanion();

  return {
    onFocus: () => {
      setFocus(field);
    },
    onBlur: () => {
      setFocus(null);
    },
    onType: () => {
      pulseTyping();
    },
  };
}
