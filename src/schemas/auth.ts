import { t } from "elysia";

export const signupDTO = t.Object({
  email: t.String({ format: "email" }),
  firstName: t.String(),
  lastName: t.String(),
  photoURL: t.Optional(t.String()),
  plan: t.String({ default: "free" }),
});
