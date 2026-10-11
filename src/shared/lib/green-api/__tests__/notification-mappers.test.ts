import { expect, test } from "bun:test";

import { MessengerUnknownError } from "@/shared/service/messenger/errors";

import { mapNotification } from "../notification-mappers";
const chatId = "12345678901@c.us";

test("mappers reject malformed shapes and timestamps and preserve only domain fields", () => {
  expect(() => mapNotification({ body: {} })).toThrow(MessengerUnknownError);
  expect(mapNotification({ receiptId: 12, body: { typeWebhook: "stateInstanceChanged" } })).toEqual(
    { type: "unsupported", receiptId: 12 },
  );
});

test.each(["incomingMessageReceived", "outgoingMessageReceived", "outgoingAPIMessageReceived"])(
  "notification maps text and extended text without acknowledging",
  (typeWebhook) => {
    for (const typeMessage of ["textMessage", "extendedTextMessage"]) {
      const mapped = mapNotification({
        receiptId: "123",
        body: {
          typeWebhook,
          idMessage: "message-id",
          timestamp: 1700000000,
          senderData: { chatId },
          messageData: {
            typeMessage,
            textMessageData: { textMessage: "text" },
            extendedTextMessageData: { text: "text" },
          },
        },
      });
      expect(mapped).toEqual({
        type: "message",
        receiptId: "123",
        message: {
          id: "message-id",
          chatId,
          direction: typeWebhook === "incomingMessageReceived" ? "incoming" : "outgoing",
          text: "text",
          timestamp: 1700000000000,
        },
      });
    }
  },
);
