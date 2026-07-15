1. Product Requirements Document (PRD)
Overview: A lightweight, highly responsive to-do list manager designed to organize daily tasks and academic workflows. It will feature a sleek, colorful UI with smooth transitions, backed by a secure user authentication system.

Features:

User Authentication: Secure Sign-Up, Login, and Logout functionality.

Task Management: Users can Add, Edit, Delete, and mark tasks as complete.

Mock Data Examples: "Solve Discrete Math 151 midterm questions," "Verify Kirchhoff's loop calculations for 3.2 A," or "Check Steam game hardware compatibility."

Secure Storage: All user credentials and personal task data must be securely saved in a database.

UX Flow:

User lands on a vibrant, welcoming Login/Signup page.

Upon successful authentication, they are redirected to the main Dashboard.

The Dashboard displays a clean, colorful list of active tasks with an input form at the top to quickly add new entries.

Clicking a task toggles its completion status; action buttons allow for quick edits or deletions.

Constraints:

Strict adherence to Test-Driven Development (TDD) principles (Red -> Green -> Refactor).

Zero hardcoded secrets; all database URIs and keys must use environment variables.

Passwords must be securely hashed before database storage.
