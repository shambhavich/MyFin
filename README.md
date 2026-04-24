# MyFin - Resilient Expense Tracker

A full-stack personal finance tool built with React, Express, and Firebase.

## Design Decisions

### Tech Stack
- **Frontend**: React 19 + Vite + Tailwind CSS + Motion. Chosen for speed, responsiveness, and polished UI.
- **Backend**: Node.js + Express. Implemented the required API endpoints (`POST /expenses`, `GET /expenses`).
- **Database**: Firestore (via Firebase Admin). Chosen for its scalability, real-time potential, and robust data persistence in real-world conditions.

### Resilience & Correctness
- **Idempotency**: The `POST /expenses` endpoint supports an `idempotencyKey`. The React client generates a unique UUID for each entry effort. If a network failure occurs and the user (or browser retry logic) sends the same request again, the backend detects the duplicate key and returns the existing record instead of creating a new one.
- **Money Handling**: Amounts are stored as doubles in Firestore. While integers (cents) are often preferred for strict precision, standard double precision is used here for simplicity in this exercise, formatted correctly in the UI.
- **Loading & Errors**: Comprehensive UI states for fetching and submitting data ensure a smooth user experience even on slow networks.

### Security
- **Backend Auth**: The server-side API uses `firebase-admin`, which bypasses client-side rules for controlled operations.
- **Firestore Rules**: Implemented strict validation and ownership checks (though bypassed by the backend API, they provide a secondary layer of defense if client-side direct access is ever enabled).

## Getting Started
The app is configured to run on port 3000.
The dev server starts the Express backend, which serves the Vite frontend as middleware.

## Intentionally Omitted
- User Authentication (Login/Signup): Mocked for this exercise to focus on the core expense tracking logic and API resilience.
- Edit/Delete functionality: Focused on the core requirements of recording and reviewing.
