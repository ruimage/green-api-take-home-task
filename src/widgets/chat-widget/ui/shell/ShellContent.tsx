import {
  Avatar,
  Container,
  EllipsisText,
  Flex,
  Icon20CloseAndroid,
  IconButton,
  Panel,
  Typography,
} from "@maxhub/max-ui";
import { useId } from "react";

import { useActiveChat } from "@/entities/chat";
import { AppContext } from "@/shared/lib/app-state/model/state-machine/app-context";
import { AppShell } from "@/shared/lib/app-state/model/state-machine/app-protocol";
import {
  selectCanClose,
  selectOpened,
} from "@/shared/lib/app-state/model/state-machine/app-selectors";

import "./shell-content.css";
import type { ShellProps } from "./types";

export function ShellContent({ title, subtitle, children }: ShellProps) {
  const titleId = useId();
  const chat = useActiveChat();
  const heading = chat?.displayName || title;
  const opened = AppContext.useSelector(selectOpened);
  const canClose = AppContext.useSelector(selectCanClose);
  const actor = AppContext.useActorRef();

  if (!opened) return null;

  return (
    <Flex asChild direction="column" align="stretch" className="messenger-shell">
      <section aria-labelledby={titleId}>
        <Panel mode="primary">
          <Flex asChild align="center" gap={12} className="messenger-shell__header">
            <header>
              <Avatar.Container size={40} form="squircle" aria-hidden="true">
                <Avatar.Text gradient="green">
                  {chat ? chat.displayName.slice(-2) : "G"}
                </Avatar.Text>
              </Avatar.Container>
              <Flex direction="column" align="stretch" gap={4} className="messenger-shell__heading">
                <EllipsisText asChild>
                  <Typography.Text asChild variant="body-strong">
                    <h2 id={titleId} title={heading}>
                      {heading}
                    </h2>
                  </Typography.Text>
                </EllipsisText>
                {subtitle && (
                  <Typography.Text color="secondary" variant="description">
                    {subtitle}
                  </Typography.Text>
                )}
              </Flex>
              <IconButton
                type="button"
                variant="ghost"
                aria-label="Закрыть чат"
                disabled={!canClose}
                onClick={() => actor.send({ type: AppShell.event.CLOSE })}
              >
                <Icon20CloseAndroid aria-hidden="true" />
              </IconButton>
            </header>
          </Flex>
          <Container fullWidth className="messenger-shell__content">
            {children}
          </Container>
        </Panel>
      </section>
    </Flex>
  );
}
