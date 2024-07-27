import Elysia from "elysia";

import { signupDTO } from "../schemas/auth";

import { AuthService } from "../services/auth";

export const auth = new Elysia({ prefix: "/auth", name: "auth" })
  .post(
    "/signup",
    async ({ body: { email, firstName, lastName, photoURL, plan } }) => {
      return await AuthService.signUp({
        email,
        firstName,
        lastName,
        photoURL,
        plan,
      });
    },
    {
      body: signupDTO,
      beforeHandle: async ({ headers, set }) => {
        if (await AuthService.isUserExists(headers.email!)) {
          set.status = 409;
          return { detail: "User already exists" };
        }
      },
    }
  )
  .get("/user-data", async () => {
    return;
  });
