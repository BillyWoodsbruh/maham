const request = require('supertest');
const app = require('./app'); // The main application file

describe('Task API - Core Functionality Tests', () => {
  let authToken;

  // Mock setup to get a valid token before running tests
  beforeAll(async () => {
    authToken = await getValidAuthToken(); 
  });

  describe('POST /api/tasks', () => {
    
    it('should create a new task successfully when authenticated', async () => {
      const newTask = {
        title: 'Solve discrete mathematics 151 midterm questions',
        completed: false
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
        title: 'Verify Kirchhoff\'s loop calculations for 3.2 A',
        completed: false
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
