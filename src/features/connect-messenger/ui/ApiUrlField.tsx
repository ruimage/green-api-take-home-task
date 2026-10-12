import { Flex, Input, Typography } from "@maxhub/max-ui";
import { useId } from "react";

import { useConnectionApiUrl, validateApiUrl } from "../model/data-state/connection-api-url";
import { ConnectMessengerContext } from "../model/state-machine/connect-messenger-context";
import { selectConnecting } from "../model/state-machine/connect-messenger-selectors";
import { useConnectionFormState } from "./connection-form-context";

export function ApiUrlField() {
  const { apiUrl, setApiUrl, editable } = useConnectionApiUrl();
  const pending = ConnectMessengerContext.useSelector(selectConnecting);
  const { submitted } = useConnectionFormState();
  const id = useId();
  const error = submitted ? validateApiUrl(apiUrl) : null;
  if (!editable) return null;

  return (
    <Flex direction="column" align="stretch" gap={8}>
      <Typography.Text asChild variant="body-strong">
        <label htmlFor={id}>ApiUrl</label>
      </Typography.Text>
      <Input
        id={id}
        name="apiUrl"
        type="url"
        autoComplete="off"
        placeholder="https://api.green-api.com"
        required
        disabled={pending}
        value={apiUrl}
        onChange={(event) => setApiUrl(event.currentTarget.value)}
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
