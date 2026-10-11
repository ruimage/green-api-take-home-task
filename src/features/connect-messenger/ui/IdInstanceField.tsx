import { Flex, Input, Typography } from "@maxhub/max-ui";
import { useEffect, useId, useRef } from "react";

import { useConnectionDraft } from "../model/data-state/connection-draft";
import { ConnectMessengerContext } from "../model/state-machine/connect-messenger-context";
import { selectConnecting } from "../model/state-machine/connect-messenger-selectors";
import { validateCredentials } from "../model/validate-credentials";
import { useConnectionFormState } from "./connection-form-context";

export function IdInstanceField() {
  const { draft, setIdInstance } = useConnectionDraft();
  const pending = ConnectMessengerContext.useSelector(selectConnecting);
  const { submitted } = useConnectionFormState();
  const error = submitted ? validateCredentials(draft).idInstance : null;
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  return (
    <Flex direction="column" align="stretch" gap={8}>
      <Typography.Text asChild variant="body-strong">
        <label htmlFor={id}>idInstance</label>
      </Typography.Text>
      <Input
        ref={input}
        id={id}
        name="idInstance"
        inputMode="numeric"
        autoComplete="off"
        required
        disabled={pending}
        value={draft.idInstance}
        onChange={(event) => setIdInstance(event.currentTarget.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <Typography.Text asChild variant="description">
          <p id={`${id}-error`} role="alert">
            {error}
          </p>
        </Typography.Text>
      )}
    </Flex>
  );
}
