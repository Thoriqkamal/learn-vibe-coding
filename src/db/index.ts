import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const connection = await mysql.createConnection(process.env.DATABASE_URL || "mysql://root:password@localhost:3306/my_database");
export const db = drizzle(connection, { schema, mode: "default" });
