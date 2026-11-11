import type { FieldErrors } from "./validation";

/** What a Server Function returns to its form. Never contains a password. */
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  reference?: string;
  errors?: FieldErrors;
  values?: Record<string, string>;
};

export const IDLE: FormState = { status: "idle" };
