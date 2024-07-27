import { Elysia } from "elysia";

import { signupDTO } from "../schemas/auth";

import { AuthService } from "../services/auth";

export const auth = new Elysia({ prefix: "/auth", name: "auth" })
  .post(
    "/signup",
    async ({ body: { email, firstName, lastName, photoURL, plan } }) => {
      const data = await AuthService.signUp({
        email,
        firstName,
        lastName,
        photoURL,
        plan,
      });
      return { detail: data };
    },
    {
      body: signupDTO,
      beforeHandle: async ({ body, set }) => {
        if (await AuthService.isUserExists(body.email!)) {
          set.status = 409;
          return { detail: "User already exists" };
        }
      },
    }
  )
  .get("/user-data", async ({ headers }) => {
    const data = await AuthService.getUserData(headers["userEmail"] as string);
    return { detail: data };
  });
