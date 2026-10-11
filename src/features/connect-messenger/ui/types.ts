import type { ReactNode } from "react";

export type ConnectionFormSlots = {
  header: ReactNode;
  idInstance: ReactNode;
  apiTokenInstance: ReactNode;
  status: ReactNode;
  actions: ReactNode;
};

export type ConnectionFormState = {
  titleId: string;
  submitted: boolean;
  resetValidation(): void;
};
