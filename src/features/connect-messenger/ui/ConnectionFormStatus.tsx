import { Typography } from "@maxhub/max-ui";

import { ConnectMessengerContext } from "../model/state-machine/connect-messenger-context";
import {
  selectConnectionAvailable,
  selectSessionError,
} from "../model/state-machine/connect-messenger-selectors";

export function ConnectionFormStatus() {
  const error = ConnectMessengerContext.useSelector(selectSessionError);
  const available = ConnectMessengerContext.useSelector(selectConnectionAvailable);
  return (
    <>
      {error && (
        <Typography.Text asChild>
          <p role="alert">{error.message}</p>
        </Typography.Text>
      )}
      {!available && (
        <Typography.Text asChild color="secondary" variant="description">
          <output>Подключение недоступно.</output>
        </Typography.Text>
      )}
    </>
  );
}
