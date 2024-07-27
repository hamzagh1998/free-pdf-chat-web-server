import { t } from "elysia";

export const signupDTO = t.Object({
  email: t.String(),
  firstName: t.String(),
  lastName: t.String(),
  photoURL: t.String({ optional: true }),
  plan: t.String({ default: "free" }),
});
