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
  .get("/:id", async ({ set, params }) => {
    const { status, detail } =
      await ConversationService.getConversationMessages(params.id);
    set.status = status;
    return detail;
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
      const fbToken = ws.data.query.token;
      const conversationId = ws.data.query.conversationId;

      if (!fbToken || !conversationId) {
        console.error("Missing token or conversationId, closing WebSocket");
        return ws.close();
      }

      try {
        // Verify Firebase token
        const decodedToken = await admin.auth().verifyIdToken(fbToken);
        ws.data.email = decodedToken?.email || decodedToken.user_id;

        const user = await userRepository.findOne({ email: ws.data.email });

        if (!user) {
          console.error("User not found, closing WebSocket");
          return ws.close();
        }

        const joinMessage = `${user.firstName || ""} ${
          user.lastName || ""
        } has entered the conversation.`;

        // Fetch initial conversation messages
        const conversation = await ConversationService.getConversationMessages(
          conversationId
        );

        if (conversation.error) {
          console.error("Error fetching conversation messages:", conversation);
          ws.publish(conversationId, {
            type: "notification",
            content: "Error couldn't get conversation messages.",
          });
          return ws.close();
        }

        // Subscribe to the conversation room
        ws.subscribe(conversationId);

        // Broadcast the join notification
        ws.publish(conversationId, {
          type: "notification",
          content: joinMessage,
        });
      } catch (error) {
        console.error("Error during WebSocket open:", error);
        ws.close();
      }
    },
    async message(ws: any, message: any) {
      const conversationId = ws.data.query.conversationId;
      if (!conversationId) {
        console.error("Missing conversationId, ignoring message.");
        return;
      }

      try {
        if (message.type === "question") {
          // Save the question or perform other business logic
          await ConversationService.sendQuestion(
            conversationId,
            message.data.userId,
            message.data.message
          );
          const responseMessage = {
            type: "messages",
            content: message.data.message,
          };

          // Broadcast to all other subscribers
          ws.publish(conversationId, responseMessage);

          // Send back to the sender explicitly
          ws.send(JSON.stringify(responseMessage));
        }

        if (message.type === "typing") {
          ws.publish(conversationId, {
            type: "typing",
            content: message.data.message,
          });
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    },
    close(ws: any) {
      const conversationId = ws.data.query.conversationId;
      const userEmail = ws.data.email;

      if (conversationId && userEmail) {
        const leaveMessage = `${userEmail} has left the chat.`;
        ws.unsubscribe(conversationId);
        ws.publish(conversationId, {
          type: "notification",
          content: leaveMessage,
        });
      }
    },
  });
