import Elysia from "elysia";

export const conversation = new Elysia({
  prefix: "/conversation",
  name: "conversation",
}).post("/new-conversation", async ({ set, body }) => {});
