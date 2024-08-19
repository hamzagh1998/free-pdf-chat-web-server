import Elysia from "elysia";

import { newConversationDTO } from "../schemas/converstaion";

import { Common } from "../services/common";
import { ConversationService } from "../services/conversation";

export const conversation = new Elysia({
  prefix: "/conversation",
  name: "conversation",
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
      body: newConversationDTO, // validate the request body
      beforeHandle: async ({ body, set }) => {
        // check if the user already exists
        if (!(await Common.isUserExists(body.email))) {
          set.status = 404;
          return { detail: "User doesn't exists" };
        }
      },
    }
  )
  .get("/conversation-messages/:id", async ({ set, params: { id } }) => {});
