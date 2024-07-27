import { userRepository } from "../db/user-repository";

type SignUp = {
  firstName: string;
  lastName: string;
  email: string;
  photoURL: string;
  plan: string;
};

export abstract class AuthService {
  static async signUp({ firstName, lastName, email, photoURL, plan }: SignUp) {
    const avatar = photoURL
      ? `https://api.dicebear.com/6.x/initials/svg?radius=50&seed=${firstName} ${lastName}`
      : photoURL;
    const user = await userRepository.create({
      firstName,
      lastName,
      email,
      photoURL: avatar,
      plan,
    });
    return { detail: user };
  }

  static async getUserData() {
    return "body";
  }

  static async isUserExists(email: string) {
    return !!(await userRepository.findOne({ email }));
  }
}
