---
description: How to initiate and conduct browser testing via the browser subagent
---

When asked to test the application using the browser agent, ALWAYS adhere to the following instructions:

1. **Check Dev Server Status**
   Check if the local dev server is running on typical ports (5173 or 5174). If no process is listening on these ports, you must start the development server first.
   // turbo
   lsof -i:5173 || lsof -i:5174

2. **Standardized Login Credentials**
   If you encounter a login screen (`/auth/login`), use one of the following test accounts based on the scenario implementation plan:
   - **User 1:** `testuser1@gmail.com` / `Testuser@1`
   - **User 2:** `testuser2@gmail.com` / `Testuser@1`
   - **User 2:** `testuser3@gmail.com` / `Testuser@1`
   - **User 2:** `testuser4@gmail.com` / `Testuser@1`
   - **User 4:** `testuser5@gmail.com` / `Testuser@1`
   - **User 5:** `testuser6@gmail.com` / `Testuser@1`

3. **General Testing Rules**
   - Always verify visible DOM updates in the browser after triggering an action.
   - If the Vite dev server hangs or throws a 504 error, restart it before proceeding.