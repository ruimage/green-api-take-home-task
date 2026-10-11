import { ApiTokenInstanceField } from "./ApiTokenInstanceField";
import { ConnectionFormActions } from "./ConnectionFormActions";
import { ConnectionFormHeader } from "./ConnectionFormHeader";
import { ConnectionFormStatus } from "./ConnectionFormStatus";
import { ConnectionFormTemplate } from "./ConnectionFormTemplate";
import { IdInstanceField } from "./IdInstanceField";

export function ConnectionForm() {
  return (
    <ConnectionFormTemplate
      header={<ConnectionFormHeader />}
      idInstance={<IdInstanceField />}
      apiTokenInstance={<ApiTokenInstanceField />}
      status={<ConnectionFormStatus />}
      actions={<ConnectionFormActions />}
    />
  );
}
