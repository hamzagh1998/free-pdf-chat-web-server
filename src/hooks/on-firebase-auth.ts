import { StatusMap } from "elysia";
import { HTTPHeaders } from "elysia/dist/types";
import * as admin from "firebase-admin";

type args = {
  bearer: string | undefined;
  set: {
    headers: HTTPHeaders;
    status?: number | keyof StatusMap;
  };
};

export async function onFirebaseAuth({ bearer, set }: args) {
  if (!bearer) {
    set.status = 400;
    set.headers[
      "WWW-Authenticate"
    ] = `Bearer realm='sign', error="invalid_request"`;

    return "Unauthorized, User token is missing!";
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(bearer);
    set.headers["userEmail"] = decodedToken.email!; // Add the decoded user email to the request headers
  } catch (error) {
    set.status = 401;
    set.headers[
      "WWW-Authenticate"
    ] = `Bearer realm='sign', error="invalid_token"`;

    return "Unauthorized, User token is invalid!";
  }
}
