import { pdfFileRepository } from "../db/pdf-file-repository";
import { userRepository } from "../db/user-repository";
import { PdfFileDocument } from "../models/pdf-file";
import { UserDocument } from "../models/user";

import { ReturnType } from "./types";

import { tryToCatch } from "../utils/try-to-catch";

type SignUp = {
  firstName: string;
  lastName: string;
  email: string;
  photoURL?: string;
  plan: string;
};

type userData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoURL: string;
  plan: string;
  memoryUsageInMB: number;
};

export abstract class AuthService {
  static async signUp({
    firstName,
    lastName,
    email,
    photoURL,
    plan,
  }: SignUp): ReturnType {
    const avatar = photoURL
      ? photoURL
      : `https://api.dicebear.com/6.x/initials/svg?radius=50&seed=${firstName} ${lastName}`;

    const [userError, userDoc] = await tryToCatch<UserDocument | null>(() =>
      userRepository.create({
        firstName,
        lastName,
        email,
        photoURL: avatar,
        plan,
      })
    );
    if (userError) {
      console.error("An error occured while getting user data: ", userError);
      return { error: true, detail: "Unexpected error occurred!", status: 500 };
    }

    return this.getUserData(userDoc!.email);
  }

  static async getUserData(email: string): ReturnType {
    let data: userData;

    const [userError, userDoc] = await tryToCatch<UserDocument | null>(
      (email: string) => userRepository.findOne({ email }),
      email
    );
    if (userError) {
      console.error("An error occured while getting user data: ", userError);
      return { error: true, detail: "Unexpected error occurred!", status: 500 };
    }

    if (!userDoc) {
      return { error: true, detail: "User not found!", status: 404 };
    }

    const [pdfFileError, pdfFiledocs] = await tryToCatch<
      PdfFileDocument[] | null
    >(
      (userId: string) => pdfFileRepository.find({ owner: userId }),
      userDoc._id
    );
    if (pdfFileError) {
      console.error(
        "An error occured while getting user pdf files: ",
        pdfFileError
      );
      return { error: true, detail: "Unexpected error occurred!", status: 500 };
    }

    if (!pdfFiledocs || !pdfFiledocs?.length) {
      data = {
        ...userDoc,
        id: userDoc._id as string,
        memoryUsageInMB: 0,
      };
      return { error: false, detail: data };
    }
    return {
      error: false,
      detail: {
        ...userDoc,
        id: userDoc._id as string,
        memoryUsageInMB: pdfFiledocs.reduce(
          (sum, doc) => sum + doc.sizeInMB,
          0
        ),
      },
    };
  }

  static async isUserExists(email: string) {
    return !!(await userRepository.findOne({ email }));
  }
}
