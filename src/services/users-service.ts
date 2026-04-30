import { db } from "../db";
import { users, sessions } from "../db/schema";
import { eq } from "drizzle-orm";

export const registerUser = async (data: { name: string; email: string; password: string }) => {
  const { name, email, password } = data;

  // Check if email already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    const error = new Error("Email already exists");
    (error as any).code = "EMAIL_ALREADY_EXISTS";
    throw error;
  }

  // Hash password using Bun's built-in hashing
  const hashedPassword = await Bun.password.hash(password);

  // Insert new user
  const [result] = await db.insert(users).values({
    name,
    email,
    password: hashedPassword,
  });

  // Fetch the newly created user to return full details (including id and created_at)
  const newUser = await db.query.users.findFirst({
    where: eq(users.id, (result as any).insertId),
  });

  if (!newUser) {
    throw new Error("Failed to retrieve created user");
  }

  // Remove password from the response
  const { password: _, ...userWithoutPassword } = newUser;
  
  return userWithoutPassword;
};

export const loginUser = async (data: { email: string; password: string }) => {
  const { email, password } = data;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    const error = new Error("Email or password is wrong");
    (error as any).code = "EMAIL_OR_PASSWORD_WRONG";
    throw error;
  }

  const isPasswordValid = await Bun.password.verify(password, user.password);

  if (!isPasswordValid) {
    const error = new Error("Email or password is wrong");
    (error as any).code = "EMAIL_OR_PASSWORD_WRONG";
    throw error;
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  await db.insert(sessions).values({
    token,
    userId: user.id,
  });

  return {
    token,
    expires_at: expiresAt.toISOString(),
  };
};
