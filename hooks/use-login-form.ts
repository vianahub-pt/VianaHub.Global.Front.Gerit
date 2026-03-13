"use client";

import { useCallback, useMemo, useReducer } from "react";

export type EmailValidationError = "" | "empty" | "invalid";
export type TenantValidationError = "" | "empty";
export type PasswordValidationError = "" | "empty";

interface LoginFormState {
  email: string;
  tenantId: string;
  password: string;
  submitCount: number;
}

type LoginFormAction =
  | { type: "SET_EMAIL"; payload: string }
  | { type: "SET_TENANT"; payload: string }
  | { type: "SET_PASSWORD"; payload: string }
  | { type: "ATTEMPT_SUBMIT" };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialState: LoginFormState = {
  email: "",
  tenantId: "",
  password: "",
  submitCount: 0,
};

function loginFormReducer(
  state: LoginFormState,
  action: LoginFormAction,
): LoginFormState {
  switch (action.type) {
    case "SET_EMAIL":
      return {
        ...state,
        email: action.payload,
      };
    case "SET_TENANT":
      return {
        ...state,
        tenantId: action.payload,
      };
    case "SET_PASSWORD":
      return {
        ...state,
        password: action.payload,
      };
    case "ATTEMPT_SUBMIT":
      return {
        ...state,
        submitCount: state.submitCount + 1,
      };
    default:
      return state;
  }
}

export function useLoginForm() {
  const [state, dispatch] = useReducer(loginFormReducer, initialState);

  const normalizedEmail = useMemo(
    () => state.email.trim().toLowerCase(),
    [state.email],
  );
  const normalizedTenantId = useMemo(
    () => state.tenantId.trim(),
    [state.tenantId],
  );
  const normalizedPassword = useMemo(
    () => state.password,
    [state.password],
  );

  const emailError = useMemo<EmailValidationError>(() => {
    if (state.submitCount === 0) {
      return "";
    }

    if (!normalizedEmail) {
      return "empty";
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return "invalid";
    }

    return "";
  }, [normalizedEmail, state.submitCount]);

  const tenantError = useMemo<TenantValidationError>(() => {
    if (state.submitCount === 0) {
      return "";
    }

    if (!normalizedTenantId) {
      return "empty";
    }

    return "";
  }, [normalizedTenantId, state.submitCount]);

  const passwordError = useMemo<PasswordValidationError>(() => {
    if (state.submitCount === 0) {
      return "";
    }

    if (!normalizedPassword.trim()) {
      return "empty";
    }

    return "";
  }, [normalizedPassword, state.submitCount]);

  const isFormValid = useMemo(
    () =>
      normalizedEmail.length > 0 &&
      normalizedTenantId.length > 0 &&
      normalizedPassword.trim().length > 0 &&
      emailError === "" &&
      tenantError === "" &&
      passwordError === "",
    [
      emailError,
      normalizedEmail,
      normalizedPassword,
      normalizedTenantId,
      passwordError,
      tenantError,
    ],
  );

  const setEmail = useCallback((email: string) => {
    dispatch({ type: "SET_EMAIL", payload: email });
  }, []);

  const setTenant = useCallback((tenantId: string) => {
    dispatch({ type: "SET_TENANT", payload: tenantId });
  }, []);

  const setPassword = useCallback((password: string) => {
    dispatch({ type: "SET_PASSWORD", payload: password });
  }, []);

  const prepareSubmit = useCallback(() => {
    dispatch({ type: "ATTEMPT_SUBMIT" });

    if (
      !normalizedEmail ||
      !normalizedTenantId ||
      !normalizedPassword.trim() ||
      !EMAIL_PATTERN.test(normalizedEmail)
    ) {
      return {
        ok: false as const,
        email: normalizedEmail,
        tenantId: normalizedTenantId,
        password: normalizedPassword,
      };
    }

    return {
      ok: true as const,
      email: normalizedEmail,
      tenantId: normalizedTenantId,
      password: normalizedPassword,
    };
  }, [normalizedEmail, normalizedPassword, normalizedTenantId]);

  return {
    state,
    normalizedEmail,
    normalizedTenantId,
    normalizedPassword,
    emailError,
    tenantError,
    passwordError,
    isFormValid,
    setEmail,
    setTenant,
    setPassword,
    prepareSubmit,
  };
}
