import { userRepository } from "../db/user-repository";

type SignUp = {
  firstName: string;
  lastName: string;
  email: string;
  photoURL?: string;
  plan: string;
};

export abstract class AuthService {
  static async signUp({ firstName, lastName, email, photoURL, plan }: SignUp) {
    const avatar = photoURL
      ? photoURL
      : `https://api.dicebear.com/6.x/initials/svg?radius=50&seed=${firstName} ${lastName}`;

    return await userRepository.create({
      firstName,
      lastName,
      email,
      photoURL: avatar,
      plan,
    });
  }

  static async getUserData(email: string) {
    return await userRepository.findOne({ email }, { __v: false });
  }

  static async isUserExists(email: string) {
    return !!(await userRepository.findOne({ email }));
  }
}
