import { db } from "../db";
import { users } from "../db/schema";
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
