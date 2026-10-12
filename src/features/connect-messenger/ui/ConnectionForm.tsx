import { ApiTokenInstanceField } from "./ApiTokenInstanceField";
import { ApiUrlField } from "./ApiUrlField";
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
      apiUrl={<ApiUrlField />}
      status={<ConnectionFormStatus />}
      actions={<ConnectionFormActions />}
    />
  );
}
