import { Button, Flex, Input, Typography } from "@maxhub/max-ui";
import { useId, useState } from "react";

import { navigation } from "../model/state-machine/navigation-vocabulary";
import { StartChatContext } from "../model/state-machine/start-chat-context";
import {
  selectNavigationError,
  selectPhoneResolving,
} from "../model/state-machine/start-chat-selectors";
export function PhoneForm() {
  const actor = StartChatContext.useActorRef();
  const pending = StartChatContext.useSelector(selectPhoneResolving);
  const error = StartChatContext.useSelector(selectNavigationError);
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const id = useId();
  const valid = /^\+?[1-9]\d{9,14}$/.test(phone.trim());
  return (
    <Flex asChild direction="column" align="stretch" gap={16} className="phone-form">
      <form
        aria-label="Новый чат"
        aria-busy={pending}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (valid && !pending) actor.send({ type: navigation.event.OPEN_CHAT, phone });
        }}
      >
        <Typography.Text asChild variant="title">
          <h3>Новый чат</h3>
        </Typography.Text>
        <Typography.Text asChild>
          <label htmlFor={id}>Номер телефона получателя</label>
        </Typography.Text>
        <Input
          id={id}
          type="tel"
          autoComplete="tel"
          placeholder="+79991234567"
          value={phone}
          disabled={pending}
          aria-invalid={submitted && !valid}
          onChange={(event) => setPhone(event.currentTarget.value)}
        />
        {submitted && !valid && (
          <Typography.Text asChild>
            <p role="alert">Введите номер с кодом страны: от 10 до 15 цифр.</p>
          </Typography.Text>
        )}
        {error && (
          <Typography.Text asChild>
            <p role="alert">{error.message}</p>
          </Typography.Text>
        )}
        <Button type="submit" loading={pending} disabled={pending}>
          {pending ? "Создаём чат…" : "Создать чат"}
        </Button>
      </form>
    </Flex>
  );
}

import "./phone-form.css";
