# MyFin - Resilient Expense Tracker

A full-stack personal finance tool built with React, Express, and Firebase.

## Design Decisions

### Tech Stack
- **Frontend**: React 19 + Vite + Tailwind CSS + Motion. Chosen for speed, responsiveness, and polished UI.
- **Backend**: Node.js + Express. Implemented the required API endpoints (`POST /expenses`, `GET /expenses`).
- **Database**: Supabase (PostgreSQL). Chosen for its powerful SQL capabilities and easy-to-use client SDK.

### Resilience & Correctness
- **Validation**: Strict validation for amounts (no negative values) and dates (no future dates).
- **Edit/Delete**: Full CRUD functionality implemented for flexible expense management.
- **Idempotency**: The `POST /expenses` endpoint supports a unique UUID for each entry effort.

## Deployment

### Vercel Deployment Note
If you are deploying to Vercel, ensure you:
1. Set `SUPABASE_URL` and `SUPABASE_KEY` in your Vercel Project Settings -> Environment Variables.
2. The included `vercel.json` ensures Express routes are properly mapped.
3. If you encounter a `JSON.parse` error, check your Vercel logs; it typically means the backend failed to start or a route returned an HTML error page instead of JSON.

## Intentionally Omitted
- User Authentication (Login/Signup): Mocked for this exercise.
