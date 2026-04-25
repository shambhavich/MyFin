# MyFin - Resilient Expense Tracker

A full-stack personal finance tool built with React, Express, and Supabase.

## Key Design Decisions

### Tech Stack
- **Frontend**: React 19 + Vite + Tailwind CSS + Motion. Chosen for speed, responsiveness, and polished UI.
- **Backend**: Node.js + Express. Implemented the required API endpoints (`POST /expenses`, `GET /expenses`, `PUT /expenses/:id`, `DELETE /expenses/:id`).
- **Database**: Supabase (PostgreSQL). Chosen for its powerful SQL capabilities, data integrity features, and easy-to-use client SDK.

### Resilience & Correctness
- **Validation**: Strict validation for amounts (no negative or zero values) and dates (no future dates).
- **Idempotency**: The `POST /expenses` endpoint supports a unique UUID for each entry effort.

## Trade-offs (Due to Timebox)
- **Pagination/Infinite Scroll**: The `GET /expenses` endpoint currently fetches all matching records at once. In a production app with thousands of expenses, I would implement cursor-based pagination to optimize performance and reduce bandwidth.
- **Complex Filtering**: Advanced filtering (e.g., date ranges, min/max amounts) was skipped in favor of core category filtering and rudimentary sorting.

## Intentionally Omitted
- **User Authentication (Login/Signup)**: Mocked for this exercise to focus on the core expense tracking logic, CRUD operations, and API stability.

## Deployment

### Vercel Deployment Note
If you are deploying to Vercel, ensure you:
1. Set `SUPABASE_URL` and `SUPABASE_KEY` in your Vercel Project Settings -> Environment Variables.
2. The included `vercel.json` ensures Express routes are properly mapped.
3. If you encounter a `JSON.parse` error, check your Vercel logs; it typically means the backend failed to start or a route returned an HTML error page instead of JSON.
