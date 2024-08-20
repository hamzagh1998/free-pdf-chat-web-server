import Elysia from "elysia";
import admin from "firebase-admin";

import { newConversationDTO } from "../schemas/converstaion";

import { Common } from "../services/common";
import { ConversationService } from "../services/conversation";
import { userRepository } from "../db/user-repository";

// Adjust the type for WebSocket handlers
export const conversation = new Elysia({
  prefix: "/conversation",
  name: "conversation",
  websocket: {
    idleTimeout: 30,
  },
})
  .post(
    "/new",
    async ({ set, body }) => {
      const { detail, status } = await ConversationService.createConversation(
        body
      );
      set.status = status;
      return detail;
    },
    {
      body: newConversationDTO,
      beforeHandle: async ({ body, set }) => {
        if (!(await Common.isUserExists(body.email))) {
          set.status = 404;
          return { detail: "User doesn't exist" };
        }
      },
    }
  )
  .ws("/messages", {
    async open(ws: any) {
      const fbToken = ws.data.query.token!;
      const conversationId = ws.data.query.conversationId!;
      if (!fbToken) ws.close();
      try {
        const decodedToken = await admin.auth().verifyIdToken(fbToken);

        ws.data.email = decodedToken?.email
          ? decodedToken.email
          : decodedToken.user_id;
        const user = await userRepository.findOne({
          email: ws.data.email,
        });
        const msg = `${
          user?.firstName + " " + user?.lastName
        } has entered the conversation`;
        const conversation = await ConversationService.getConversationMessages(
          conversationId
        );
        ws.subscribe(conversationId);
        if (conversation.error) {
          ws.publish(conversationId, {
            type: "notification",
            content: "Error couldn't get conversation messages",
          });
          console.error(
            "Error while getting conversation messages",
            conversation
          );
          ws.close();
        }
        ws.publish(conversationId, { type: "notification", content: msg });
        ws.publish(conversationId, {
          type: "messages",
          content: conversation.detail,
        });
      } catch (error) {
        console.error("Error while verifying token", error);
        ws.close();
      }
    },
    message(ws: any, message: any) {
      // this is a group chat
      // so the server re-broadcasts incoming message to everyone
      const conversationId = ws.data.query.conversationId!;

      if (message.type === "question") {
        //TODO: Send the question to the AI
        ConversationService.sendQuestion(
          conversationId,
          message.data.userId,
          message.data.message
        );
      }

      ws.publish(conversationId, `${ws.data.email}: ${message}`);
    },
    close(ws: any) {
      const conversationId = ws.data.query.conversationId!;
      const msg = `${ws.data.email} has left the chat`;

      ws.unsubscribe(conversationId);
      ws.publish(conversationId, msg);
    },
  });
