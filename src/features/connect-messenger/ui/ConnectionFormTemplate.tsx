import { Flex } from "@maxhub/max-ui";
import { useId, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { useConnectionApiUrl, validateApiUrl } from "../model/data-state/connection-api-url";
import { useConnectionDraft } from "../model/data-state/connection-draft";
import { ConnectMessengerContext } from "../model/state-machine/connect-messenger-context";
import {
  selectConnectionAvailable,
  selectConnecting,
} from "../model/state-machine/connect-messenger-selectors";
import { session } from "../model/state-machine/session-vocabulary";
import { validateCredentials } from "../model/validate-credentials";
import { ConnectionFormContext } from "./connection-form-context";
import type { ConnectionFormSlots } from "./types";

import "./connection-form.css";

export function ConnectionFormTemplate({
  header,
  idInstance,
  apiTokenInstance,
  apiUrl,
  status,
  actions,
}: ConnectionFormSlots) {
  const actor = ConnectMessengerContext.useActorRef();
  const pending = ConnectMessengerContext.useSelector(selectConnecting);
  const available = ConnectMessengerContext.useSelector(selectConnectionAvailable);
  const { draft } = useConnectionDraft();
  const { apiUrl: apiUrlValue, editable: apiUrlEditable } = useConnectionApiUrl();
  const [submitted, setSubmitted] = useState(false);
  const titleId = `${useId()}-title`;
  const state = useMemo(
    () => ({ titleId, submitted, resetValidation: () => setSubmitted(false) }),
    [titleId, submitted],
  );

  function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !available) return;
    setSubmitted(true);
    const errors = validateCredentials(draft);
    const invalidField = errors.idInstance
      ? "idInstance"
      : errors.apiTokenInstance
        ? "apiTokenInstance"
        : apiUrlEditable && validateApiUrl(apiUrlValue)
          ? "apiUrl"
          : null;
    if (invalidField) {
      const field = event.currentTarget.elements.namedItem(invalidField);
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    const connectEvent = { type: session.event.CONNECT, credentials: draft };
    if (actor.getSnapshot().can(connectEvent)) actor.send(connectEvent);
  }

  return (
    <ConnectionFormContext value={state}>
      <form
        className="connection-form"
        aria-labelledby={titleId}
        aria-busy={pending}
        noValidate
        onSubmit={connect}
      >
        <Flex direction="column" align="stretch" gap={24}>
          {header}
          {idInstance}
          {apiTokenInstance}
          {apiUrl}
          {status}
          {actions}
        </Flex>
      </form>
    </ConnectionFormContext>
  );
}
