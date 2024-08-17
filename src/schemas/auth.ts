import { t } from "elysia";

export const signupDTO = t.Object({
  email: t.String(), // if the provider is facebook the email will be uid
  firstName: t.String(),
  lastName: t.String(),
  photoURL: t.Optional(t.String()),
  plan: t.String({ default: "free" }),
});
