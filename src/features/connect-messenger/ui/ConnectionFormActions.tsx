import { Button, Flex } from "@maxhub/max-ui";

import { ConnectMessengerContext } from "../model/state-machine/connect-messenger-context";
import {
  selectConnectionAvailable,
  selectConnecting,
} from "../model/state-machine/connect-messenger-selectors";
import { session } from "../model/state-machine/session-vocabulary";
import { useConnectionFormState } from "./connection-form-context";

export function ConnectionFormActions() {
  const actor = ConnectMessengerContext.useActorRef();
  const pending = ConnectMessengerContext.useSelector(selectConnecting);
  const available = ConnectMessengerContext.useSelector(selectConnectionAvailable);
  const { resetValidation } = useConnectionFormState();
  return (
    <Flex direction="column" align="stretch" gap={8}>
      <Button type="submit" stretched loading={pending} disabled={pending || !available}>
        {pending ? "Подключение…" : "Подключить"}
      </Button>
      {pending && (
        <Button
          type="button"
          variant="secondary"
          stretched
          onClick={() => {
            resetValidation();
            actor.send({ type: session.event.DISCONNECT });
          }}
        >
          Отменить подключение
        </Button>
      )}
    </Flex>
  );
}
