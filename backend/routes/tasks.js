const express = require('express');
const { body, param, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const { createTask, getTasksByUser, updateTask, deleteTask } = require('../models/Task');

const router = express.Router();

// All task routes require a valid JWT
router.use(authMiddleware);

/**
 * GET /api/tasks
 * Returns all tasks belonging to the authenticated user.
 */
router.get('/', (req, res) => {
  try {
    const tasks = getTasksByUser(req.user.id);
    return res.status(200).json(tasks);
  } catch (err) {
    console.error('Get tasks error:', err.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

/**
 * POST /api/tasks
 * Creates a new task. Requires { title } in the request body.
 * Returns 201 { id, title, completed } on success.
 */
router.post(
  '/',
  [body('title').trim().notEmpty().withMessage('Task title is required')],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    try {
      const task = createTask(req.user.id, req.body.title);
      return res.status(201).json(task);
    } catch (err) {
      console.error('Create task error:', err.message);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

/**
 * PUT /api/tasks/:id
 * Updates a task's title and/or completed status. Owner-only.
 */
router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid task ID'),
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('completed').optional().isBoolean().withMessage('Completed must be a boolean'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    try {
      const updated = updateTask(parseInt(req.params.id), req.user.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.status(200).json(updated);
    } catch (err) {
      console.error('Update task error:', err.message);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

/**
 * DELETE /api/tasks/:id
 * Deletes a task. Owner-only.
 */
router.delete(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Invalid task ID')],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    try {
      const deleted = deleteTask(parseInt(req.params.id), req.user.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.status(200).json({ message: 'Task deleted successfully' });
    } catch (err) {
      console.error('Delete task error:', err.message);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

module.exports = router;
