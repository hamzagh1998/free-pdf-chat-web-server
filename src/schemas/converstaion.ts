import { t } from "elysia";

export const newConversationDTO = t.Object({
  userEmail: t.String(), // if the provider is facebook the email will be uid
  fileName: t.String(),
  fileURL: t.String(),
  fileSizeInMB: t.Number(),
  plan: t.String({ default: "free" }),
});
