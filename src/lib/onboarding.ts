import { randomBytes } from "node:crypto"
import bcrypt from "bcrypt"

const PASSWORD_HASH_ROUNDS = 12

export function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_HASH_ROUNDS)
}

export function generateRandomPassword() {
  return randomBytes(9).toString("base64url")
}
