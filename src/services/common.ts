import { pdfFileRepository } from "../db/pdf-file-repository";
import { userRepository } from "../db/user-repository";

import { PdfFileDocument } from "../models/pdf-file";

import { ReturnType } from "./types";

import { tryToCatch } from "../utils/try-to-catch";
import { conversationRepository } from "../db/conversation-repository";
import { ConversationDocument } from "../models/conversation";

export class Common {
  static async isUserExists(email: string) {
    return !!(await userRepository.findOne({ email }));
  }

  static async getUserFileUsageInMB(
    userId: string
  ): ReturnType<number | string> {
    const [pdfFileError, pdfFiledocs] = await tryToCatch<
      PdfFileDocument[] | null
    >((userId: string) => pdfFileRepository.find({ owner: userId }), userId);
    if (pdfFileError) {
      console.error(
        "An error occured while getting user pdf files: ",
        pdfFileError
      );
      return { error: true, detail: "Unexpected error occurred!", status: 500 };
    }

    if (!pdfFiledocs || !pdfFiledocs?.length) {
      return { error: false, detail: 0 };
    }
    return {
      error: false,
      detail: pdfFiledocs.reduce((sum, doc) => sum + doc.sizeInMB, 0),
    };
  }

  static async getUserConversations(userId: string) {
    const [error, conversations] = await tryToCatch<
      ConversationDocument[] | null
    >(
      (userId: string) =>
        conversationRepository.find(
          { participants: { $in: [userId] } },
          { __v: 0 }
        ),
      userId
    );
    if (error) {
      console.error(
        "An error occured while getting user conversations: ",
        error
      );
      return { error: true, detail: "Unexpected error occurred!", status: 500 };
    }

    if (!conversations || !conversations?.length) {
      return { error: false, detail: [] };
    }

    return { error: false, detail: conversations };
  }
}
