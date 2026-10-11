import { Flex, Typography } from "@maxhub/max-ui";

import { useConnectionFormState } from "./connection-form-context";

export function ConnectionFormHeader() {
  const { titleId } = useConnectionFormState();
  return (
    <Flex direction="column" align="stretch" gap={8}>
      <Typography.Text asChild variant="title">
        <h3 id={titleId}>Подключение чата</h3>
      </Typography.Text>
      <Typography.Text color="secondary" variant="description">
        Введите данные инстанса из личного кабинета GREEN-API.
      </Typography.Text>
    </Flex>
  );
}
