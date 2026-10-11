import type { MessengerCredentialsDto } from "@/shared/service/messenger/dto";

export function validateCredentials(credentials: MessengerCredentialsDto) {
  return {
    idInstance: !credentials.idInstance.trim()
      ? "Введите idInstance."
      : !/^\d+$/.test(credentials.idInstance.trim())
        ? "idInstance должен содержать только цифры."
        : null,
    apiTokenInstance: !credentials.apiTokenInstance.trim() ? "Введите apiTokenInstance." : null,
  };
}

export function validCredentials(credentials: MessengerCredentialsDto | null): boolean {
  if (!credentials) return false;
  const errors = validateCredentials(credentials);
  return !errors.idInstance && !errors.apiTokenInstance;
}
