# Agent Security & Architecture Rules

## 1. Zero-Trust Security Model
*   **No Hardcoded Secrets:** NEVER hardcode API keys, database URIs, JWT secrets, or passwords in the source code. Always use `.env` files and environment variables.
*   **Password Cryptography:** All passwords MUST be hashed and salted using `bcrypt` (with a cost factor of at least 10) before database storage. Plain-text passwords are strictly forbidden.
*   **Input Sanitization:** Validate and sanitize all user inputs on both the frontend and backend to prevent SQL Injection, NoSQL Injection, and Cross-Site Scripting (XSS).
*   **Secure Authentication:** Protect all private routes and API endpoints using JWT (JSON Web Tokens) or secure session cookies. The server must verify the token on every protected request.

## 2. Architecture & Coding Standards
*   **Clean Code:** Write modular, DRY (Don't Repeat Yourself), and well-documented code. Separate database logic, routing, and UI components into distinct files.
*   **Sleek UI/UX:** Use responsive, mobile-first design principles. Utilize vibrant, modern color palettes with smooth CSS transitions. Keep the interface lightweight and clutter-free.

## 3. Robust Error Handling
*   **Graceful Failures:** Catch all backend exceptions. The server must never crash due to an unhandled promise or logic error.
*   **Secure Logs:** Never expose database schemas, stack traces, or sensitive user data in frontend error messages. Return generic, user-friendly error messages to the client (e.g., "Invalid credentials" instead of "User not found").