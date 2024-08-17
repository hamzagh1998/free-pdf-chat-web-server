import { Elysia } from "elysia";

import { signupDTO } from "../schemas/auth";

import { AuthService } from "../services/auth";

export const auth = new Elysia({ prefix: "/auth", name: "auth" })
  .post(
    "/signup",
    async ({ set, body: { email, firstName, lastName, photoURL, plan } }) => {
      const result = await AuthService.signUp({
        email,
        firstName,
        lastName,
        photoURL,
        plan,
      });
      if (result.error) {
        set.status = result.status;
      }
      return result.detail;
    },
    {
      body: signupDTO,
      beforeHandle: async ({ body, set }) => {
        if (await AuthService.isUserExists(body.email)) {
          set.status = 409;
          return { detail: "User already exists" };
        }
      },
    }
  )
  .get("/user-data", async ({ set, headers }) => {
    const result = await AuthService.getUserData(
      headers["userEmail"] as string
    );
    if (result.error) {
      set.status = result.status;
    }
    return result.detail;
  });
