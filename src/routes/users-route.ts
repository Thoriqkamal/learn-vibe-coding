import { Elysia, t } from "elysia";
import { registerUser, loginUser, getCurrentUser, logoutUser } from "../services/users-service";

export const usersRoutes = new Elysia()
  .onError(({ error, set }) => {
    if ((error as any).code === "UNAUTHORIZED") {
      set.status = 401;
      return {
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      };
    }
  })
  .derive(({ headers }) => ({
    getAuthToken: () => {
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
        const error = new Error("Unauthorized");
        (error as any).code = "UNAUTHORIZED";
        throw error;
      }
      return authHeader.substring(7).trim();
    },
  }))
  .get("/user", async ({ getAuthToken }) => {
    const token = getAuthToken();
    const user = await getCurrentUser(token);
    return user;
  })
  .post("/logout", async ({ getAuthToken }) => {
    const token = getAuthToken();
    const result = await logoutUser(token);
    return result;
  })
  .post(
    "/login",
    async ({ body, set }) => {
      try {
        const result = await loginUser(body);
        return result;
      } catch (error: any) {
        if (error.code === "EMAIL_OR_PASSWORD_WRONG") {
          set.status = 401;
          return {
            message: "Email or password is wrong",
            code: "EMAIL_OR_PASSWORD_WRONG",
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
        email: t.String(),
        password: t.String(),
      }),
    }
  )
  .group("/users", (app) =>
    app.post(
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
          name: t.String({ maxLength: 255 }),
          email: t.String({ format: "email", maxLength: 255 }),
          password: t.String({ maxLength: 255 }),
        }),
      }
    )
  );
