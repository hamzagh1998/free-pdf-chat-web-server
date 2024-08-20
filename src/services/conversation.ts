import * as pdfjsLib from "pdfjs-dist/build/pdf";
import "pdfjs-dist/build/pdf.worker";
import OpenAI from "openai";

import { userRepository } from "../db/user-repository";
import { UserDocument } from "../models/user";
import { pdfFileRepository } from "../db/pdf-file-repository";
import { PdfFileDocument } from "../models/pdf-file";
import { conversationRepository } from "../db/conversation-repository";
import { ConversationDocument } from "../models/conversation";
import { MessageDocument } from "../models/messages";
import { messageRepository } from "../db/message-repository";

import { NewConversation } from "../schemas/converstaion";

import { Common } from "./common";

import { tryToCatch } from "../utils/try-to-catch";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const aiResponse = async (content: string) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a knowledgeable assistant with access to the content of a PDF document. Use this information to answer questions related to the document.",
        },
        { role: "user", content },
      ],
    });
    return completion.choices[0].message || "No response content";
  } catch (error) {
    console.error("Error in AI response:", error);
    throw error;
  }
};

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

  static async getConversationMessages(conversationId: string) {
    const conversationDoc = await this.getConversation(conversationId);

    if (conversationDoc.error) {
      console.error(conversationDoc.error);
      return {
        error: true,
        status: 500,
        detail: "Error while fetching conversation",
      };
    }

    if (!conversationDoc) {
      return {
        error: true,
        status: 404,
        detail: "Conversation not found",
      };
    }

    const [messagesError, messagesDocs] = await tryToCatch<
      MessageDocument[] | null
    >(
      (conversationId: string) =>
        messageRepository.find({ conversationId }, { __v: 0 }),
      conversationId
    );

    if (messagesError) {
      console.error(
        "An error occured while getting conversation messages: ",
        messagesError
      );
      return { error: true, detail: "Unexpected error occurred!", status: 500 };
    }

    return {
      error: false,
      status: 200,
      detail: {
        messagesDocs,
        users: (conversationDoc.detail as any).participants,
      },
    };
  }

  static async sendQuestion(
    conversationId: string,
    userId: string,
    msg: string
  ) {
    const conversationDoc = await this.getConversation(conversationId);

    if (conversationDoc.error) {
      console.error(conversationDoc.error);
      return {
        error: true,
        status: 500,
        detail: "Error while fetching conversation",
      };
    }

    if (!conversationDoc) {
      return {
        error: true,
        status: 404,
        detail: "Conversation not found",
      };
    }

    const pdfFileURL = (conversationDoc.detail as any).pdfFileUrl;

    const parsedPDFText = await this.parsePDF(pdfFileURL);

    //* Save Question: user
    // const [error, messageDoc] = await tryToCatch<MessageDocument>(() =>
    // );

    //* Save Answer: AI
    const prompt = `Here is the content of the PDF document:\n\n${parsedPDFText}\n\nUser's question: ${msg}`;
    const response = await aiResponse(prompt);
    await messageRepository.create({
      conversationId,
      sender: userId,
      content: msg,
    });
    await messageRepository.create({
      conversationId,
      sender: userId,
      content: response,
      isAiResponse: true,
    });

    console.log(response);
  }

  private static async parsePDF(pdfFileURL: string) {
    try {
      // Fetch the PDF file
      const response = await fetch(pdfFileURL);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      let allText = "";

      // Extract text from each page
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        allText += pageText + `\nPage number ${i}\n`;
      }

      return allText;
    } catch (error) {
      console.error("Error parsing PDF:", error);
      throw error;
    }
  }
}
