import { Flex, Input, Typography } from "@maxhub/max-ui";
import { useId } from "react";

import { useConnectionDraft } from "../model/data-state/connection-draft";
import { ConnectMessengerContext } from "../model/state-machine/connect-messenger-context";
import { selectConnecting } from "../model/state-machine/connect-messenger-selectors";
import { validateCredentials } from "../model/validate-credentials";
import { useConnectionFormState } from "./connection-form-context";

export function ApiTokenInstanceField() {
  const { draft, setApiTokenInstance } = useConnectionDraft();
  const pending = ConnectMessengerContext.useSelector(selectConnecting);
  const { submitted } = useConnectionFormState();
  const error = submitted ? validateCredentials(draft).apiTokenInstance : null;
  const id = useId();

  return (
    <Flex direction="column" align="stretch" gap={8}>
      <Typography.Text asChild variant="body-strong">
        <label htmlFor={id}>apiTokenInstance</label>
      </Typography.Text>
      <Input
        id={id}
        name="apiTokenInstance"
        type="password"
        autoComplete="off"
        spellCheck={false}
        required
        disabled={pending}
        value={draft.apiTokenInstance}
        onChange={(event) => setApiTokenInstance(event.currentTarget.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : `${id}-privacy`}
      />
      {error && (
        <Typography.Text asChild variant="description">
          <p id={`${id}-error`} role="alert">
            {error}
          </p>
        </Typography.Text>
      )}
      <Typography.Text asChild color="secondary" variant="description">
        <p id={`${id}-privacy`}>Данные подключения хранятся только в памяти этой сессии.</p>
      </Typography.Text>
    </Flex>
  );
}
