import { userRepository } from "../db/user-repository";
import { UserDocument } from "../models/user";

import { NewConversation } from "../schemas/converstaion";

import { Common } from "./common";

import { tryToCatch } from "../utils/try-to-catch";
import { pdfFileRepository } from "../db/pdf-file-repository";
import { PdfFileDocument } from "../models/pdf-file";
import { conversationRepository } from "../db/conversation-repository";
import { ConversationDocument } from "../models/conversation";

export abstract class ConversationService extends Common {
  static async createConversation({
    email,
    fileName,
    fileURL,
    fileSizeInMB,
  }: NewConversation) {
    const [error, userDoc] = await tryToCatch<UserDocument | null>(
      (email: string) => userRepository.findOne({ email }),
      email
    );
    if (error) {
      console.error(error);
      return {
        error: true,
        status: 500,
        detail: "Error while creating conversation",
      };
    }

    if (!userDoc) {
      return {
        error: true,
        status: 404,
        detail: "User not found",
      };
    }

    const [createPdferror, pdfDoc] = await tryToCatch<PdfFileDocument>(() =>
      pdfFileRepository.checkAndCreate(
        { owner: userDoc._id, name: fileName, sizeInMB: fileSizeInMB },
        {
          name: fileName,
          url: fileURL,
          sizeInMB: fileSizeInMB,
          owner: userDoc._id,
        }
      )
    );

    if (createPdferror) {
      console.error(createPdferror);
      return {
        error: true,
        status: 500,
        detail: "Error while creating pdf document",
      };
    }

    const [createConversation, _] = await tryToCatch<ConversationDocument>(() =>
      conversationRepository.checkAndCreate(
        { pdfFile: pdfDoc?._id },
        {
          name: pdfDoc?.name,
          owner: userDoc._id,
          participants: [userDoc._id],
          pdfFile: pdfDoc?._id,
        }
      )
    );

    if (createConversation) {
      console.error(createConversation);
      return {
        error: true,
        status: 500,
        detail: "Error while creating conversation",
      };
    }

    return {
      error: false,
      detail: "Conversation created successfully!",
      status: 201,
    };
  }
}
