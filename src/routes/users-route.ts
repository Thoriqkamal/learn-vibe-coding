import { Elysia, t } from "elysia";
import { registerUser, loginUser } from "../services/users-service";

export const usersRoutes = new Elysia()
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
          name: t.String(),
          email: t.String(),
          password: t.String(),
        }),
      }
    )
  );
