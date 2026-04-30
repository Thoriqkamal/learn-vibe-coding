import { Elysia, t } from "elysia";
import { registerUser } from "../services/users-service";

export const usersRoutes = new Elysia({ prefix: "/users" })
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const user = await registerUser(body);
        set.status = 201;
        return user;
      } catch (error: any) {
        if (error.code === "EMAIL_ALREADY_EXISTS") {
          set.status = 400;
          return {
            message: "Email already exists",
            code: "EMAIL_ALREADY_EXISTS",
          };
        }
        
        set.status = 500;
        return {
          message: error.message || "Internal Server Error",
        };
      }
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String(),
        password: t.String(),
      }),
    }
  );
