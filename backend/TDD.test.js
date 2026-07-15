/**
 * TDD.test.js
 * Task API — Core Functionality Tests (TDD)
 * Uses Jest + Supertest against the real Express app with an in-memory SQLite DB.
 *
 * This is the working replacement for the old root-level `TDDtest.js`, which
 * was an orphaned draft that could never actually run (missing dependencies,
 * a wrong `require('./app')` path, and an undefined `getValidAuthToken`
 * helper). This file mirrors `tasks.test.js`, placed here in `backend/` where
 * the real Express app and test dependencies (`supertest`, `jest`) live.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_jest_only';

const request = require('supertest');
const app = require('./app');

// ── Helper ──────────────────────────────────────────────────────────────────

/**
 * Registers a fresh test user and returns the JWT.
 * A unique email is used each run to avoid conflicts with the in-memory DB.
 */
async function getValidAuthToken() {
  const uniqueEmail = `testuser_${Date.now()}@jest.test`;
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'Test User',
      email: uniqueEmail,
      password: 'securepassword123',
    });

  if (response.status !== 201) {
    throw new Error(`Failed to get auth token: ${JSON.stringify(response.body)}`);
  }

  return response.body.token;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Task API - Core Functionality Tests', () => {
  let authToken;

  // Initialize the DB and get a valid token before running tests
  beforeAll(async () => {
    await app.initDb();
    authToken = await getValidAuthToken();
  });

  describe('POST /api/tasks', () => {
    it('should create a new task successfully when authenticated', async () => {
      const newTask = {
        title: 'Solve discrete mathematics 151 midterm questions',
        completed: false,
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newTask);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(newTask.title);
      expect(response.body.completed).toBe(false);
    });

    it('should return 401 Unauthorized if no authentication token is provided', async () => {
      const newTask = {
        title: "Verify Kirchhoff's loop calculations for 3.2 A",
        completed: false,
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(newTask);

      // Asserts that the app rejects unauthenticated users
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 Bad Request if the task title is missing', async () => {
      const invalidTask = { completed: false };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTask);

      // Asserts that the app validates input fields securely
      expect(response.status).toBe(400);
    });
  });
});
