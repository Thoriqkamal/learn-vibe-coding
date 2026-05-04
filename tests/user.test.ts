import { describe, expect, it, beforeEach } from "bun:test";
import { app } from "../src/index";
import { db } from "../src/db";
import { users, sessions } from "../src/db/schema";

describe("User API Tests", () => {
  beforeEach(async () => {
    // Clear database before each test to ensure consistency
    await db.delete(sessions);
    await db.delete(users);
  });

  describe("1. Root & Healthcheck APIs", () => {
    it("GET / should return 200 and 'Hello Elysia'", async () => {
      const response = await app.handle(new Request("http://localhost/"));
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("Hello Elysia");
    });

    it("GET /users should return 200 and an empty array initially", async () => {
      const response = await app.handle(new Request("http://localhost/users"));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([]);
    });
  });

  describe("2. User Registration (POST /api/users)", () => {
    it("Success: should register a user successfully", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "John Doe",
            email: "john@example.com",
            password: "password123",
          }),
        })
      );
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.name).toBe("John Doe");
      expect(json.email).toBe("john@example.com");
      expect(json.password).toBeUndefined();
    });

    it("Failed: should fail if email already exists", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      // First registration
      await app.handle(
        new Request("http://localhost/api/users/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        })
      );

      // Second registration with same email
      const response = await app.handle(
        new Request("http://localhost/api/users/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Jane Doe",
            email: "john@example.com",
            password: "password456",
          }),
        })
      );
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("EMAIL_ALREADY_EXISTS");
    });

    it("Failed: should fail validation if required fields are missing", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "John Doe",
            // missing email and password
          }),
        })
      );
      // Elysia returns 422 for validation errors
      expect(response.status).toBe(422);
    });

    it("Failed: should fail if email format is invalid", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "John Doe",
            email: "not-an-email",
            password: "password123",
          }),
        })
      );
      expect(response.status).toBe(422);
    });

    it("Failed: should fail if name exceeds 255 characters", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "A".repeat(256),
            email: "long@example.com",
            password: "password123",
          }),
        })
      );
      expect(response.status).toBe(422);
    });
  });

  describe("3. User Login (POST /api/login)", () => {
    beforeEach(async () => {
      await app.handle(
        new Request("http://localhost/api/users/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "John Doe",
            email: "john@example.com",
            password: "password123",
          }),
        })
      );
    });

    it("Success: should login successfully with correct credentials", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "john@example.com",
            password: "password123",
          }),
        })
      );
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.token).toBeDefined();
      expect(json.token.length).toBeGreaterThan(0);
    });

    it("Failed: should return 401 for incorrect password", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "john@example.com",
            password: "wrongpassword",
          }),
        })
      );
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.code).toBe("EMAIL_OR_PASSWORD_WRONG");
    });

    it("Failed: should return 401 for non-existent email", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "nobody@example.com",
            password: "password123",
          }),
        })
      );
      expect(response.status).toBe(401);
    });
  });

  describe("4. Get Current User (GET /api/user)", () => {
    let validToken: string;

    beforeEach(async () => {
      await app.handle(
        new Request("http://localhost/api/users/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "John Doe",
            email: "john@example.com",
            password: "password123",
          }),
        })
      );

      const loginResponse = await app.handle(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "john@example.com",
            password: "password123",
          }),
        })
      );
      const loginJson = await loginResponse.json();
      validToken = loginJson.token;
    });

    it("Success: should return user profile with valid token", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/user", {
          headers: { Authorization: `Bearer ${validToken}` },
        })
      );
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.email).toBe("john@example.com");
      expect(json.name).toBe("John Doe");
      expect(json.password).toBeUndefined();
    });

    it("Failed: should return 401 without Authorization header", async () => {
      const response = await app.handle(new Request("http://localhost/api/user"));
      expect(response.status).toBe(401);
    });

    it("Failed: should return 401 for invalid Bearer format", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/user", {
          headers: { Authorization: validToken }, // Missing "Bearer "
        })
      );
      expect(response.status).toBe(401);
    });

    it("Failed: should return 401 for invalid/expired token", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/user", {
          headers: { Authorization: "Bearer invalid_token" },
        })
      );
      expect(response.status).toBe(401);
    });
  });

  describe("5. User Logout (POST /api/logout)", () => {
    let validToken: string;

    beforeEach(async () => {
      await app.handle(
        new Request("http://localhost/api/users/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "John Doe",
            email: "john@example.com",
            password: "password123",
          }),
        })
      );

      const loginResponse = await app.handle(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "john@example.com",
            password: "password123",
          }),
        })
      );
      const loginJson = await loginResponse.json();
      validToken = loginJson.token;
    });

    it("Success: should logout successfully", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${validToken}` },
        })
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ message: "Logout success" });

      // Verify token is no longer valid
      const secondResponse = await app.handle(
        new Request("http://localhost/api/user", {
          headers: { Authorization: `Bearer ${validToken}` },
        })
      );
      expect(secondResponse.status).toBe(401);
    });

    it("Failed: should return 401 without Authorization header", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/logout", {
          method: "POST",
        })
      );
      expect(response.status).toBe(401);
    });
  });
});
