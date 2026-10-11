export class MessengerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class MessengerConnectionError extends MessengerError {
  constructor(message = "Не удалось подключиться к сервису.") {
    super(message);
  }
}
export class MessengerUnauthorizedError extends MessengerError {
  constructor(message = "Подключение не авторизовано.") {
    super(message);
  }
}
export class MessengerRateLimitError extends MessengerError {
  constructor(message = "Слишком много запросов. Попробуйте позже.") {
    super(message);
  }
}
export class MessengerNetworkError extends MessengerError {
  constructor(message = "Ошибка сети. Проверьте подключение.") {
    super(message);
  }
}
export class MessengerUnknownError extends MessengerError {
  constructor(message = "Не удалось выполнить операцию.") {
    super(message);
  }
}
