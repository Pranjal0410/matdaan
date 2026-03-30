# Matdaan Backend: In-Depth Code Walkthrough and Testing Guide

This document explains how the backend is structured, how each module works, how the security model is enforced, and how to test the full backend end-to-end.

## 1. Tech Stack and Runtime

- Runtime: Node.js
- Web framework: Express
- Database: MySQL
- ORM: Sequelize
- Auth: JWT (`jsonwebtoken`)
- Password hashing: `bcryptjs`
- Security middleware: `helmet`, `cors`
- Logging: `morgan`

## 2. High-Level Architecture

The backend follows a layered structure:

- Entry point and server bootstrapping: `index.js`
- Database config: `src/config/database.js`
- Data models: `src/models/*.js`
- Security and error middleware: `src/middleware/*.js`
- Feature endpoints: `src/routes/*.js`

Request lifecycle:

1. Express receives a request.
2. Middleware runs (`helmet`, `cors`, JSON parsing, logging).
3. Route handler executes business logic.
4. Sequelize performs DB operations.
5. Response is returned as JSON.
6. Unhandled exceptions are captured by error middleware.

## 3. Server Startup Flow

File: `index.js`

What it does:

1. Loads environment variables.
2. Creates Express app and registers middleware.
3. Registers route groups:
   - `/api/auth`
   - `/api/elections`
   - `/api/votes`
   - `/api/results`
4. Connects to MySQL (`sequelize.authenticate()`).
5. Synchronizes models (`sequelize.sync()`).
6. Starts listening on `PORT`.

Important note:

- `sequelize.sync()` auto-creates/updates tables from models. This is practical for development. For production, migrations are recommended.

## 4. Data Model and Relationships

### 4.1 User Model (`src/models/User.js`)

Fields:

- `id`: PK
- `name`
- `email` (unique)
- `passwordHash`
- `role`: `admin` or `voter`

Purpose:

- Stores system users and their authorization level.

### 4.2 Election Model (`src/models/Election.js`)

Fields:

- `id`: PK
- `title`
- `description`
- `startDate`
- `endDate`
- `isActive`

Purpose:

- Defines voting windows and election metadata.

### 4.3 Candidate Model (`src/models/Candidate.js`)

Fields:

- `id`: PK
- `name`
- `party`
- `manifesto`
- `electionId` (FK via association)

Purpose:

- Represents participants in a specific election.

### 4.4 Vote Model (`src/models/Vote.js`)

Fields:

- `id`: PK
- `userId` (FK)
- `electionId` (FK)
- `candidateId` (FK)

Critical constraint:

- Unique index on `(userId, electionId)`.

Why it matters:

- Guarantees one vote per user per election at database level.

### 4.5 Associations (`src/models/index.js`)

- `Election hasMany Candidate`
- `Candidate belongsTo Election`
- `User hasMany Vote`
- `Vote belongsTo User`
- `Election hasMany Vote`
- `Vote belongsTo Election`
- `Candidate hasMany Vote`
- `Vote belongsTo Candidate`

## 5. Authentication and Authorization

### 5.1 Register/Login (`src/routes/authRoutes.js`)

- `POST /api/auth/register`
  - Validates required fields.
  - Checks duplicate email.
  - Hashes password with bcrypt.
  - Creates user.

- `POST /api/auth/login`
  - Validates credentials.
  - Compares password hash.
  - Issues JWT with payload: `id`, `email`, `role`.

- `GET /api/auth/verify-token`
  - Protected route that confirms token validity.

### 5.2 Token Verification Middleware (`src/middleware/auth.js`)

- Reads `Authorization: Bearer <token>`.
- Verifies JWT using `JWT_SECRET`.
- Adds decoded payload to `req.user`.

### 5.3 Admin-Only Middleware (`requireAdmin`)

- Blocks requests unless `req.user.role === 'admin'`.

## 6. Feature Logic by Route

### 6.1 Election Management (`src/routes/electionRoutes.js`)

- `POST /api/elections` (admin)
  - Creates election.
  - Validates date range (`startDate < endDate`).

- `GET /api/elections`
  - Lists elections.

- `POST /api/elections/:electionId/candidates` (admin)
  - Adds candidate to election.

- `GET /api/elections/:electionId/candidates`
  - Returns election metadata and candidate list.

### 6.2 Secure Voting (`src/routes/voteRoutes.js`)

- `POST /api/votes` (authenticated user)

Voting checks:

1. Request has `electionId` and `candidateId`.
2. Election is active and current time is within `[startDate, endDate]`.
3. Candidate belongs to the same election.
4. User has not voted in this election before.

Implementation details:

- Uses a DB transaction to keep checks and vote insertion consistent.
- Handles unique constraint conflict gracefully.

### 6.3 Results Dashboard (`src/routes/resultRoutes.js`)

- `GET /api/results/:electionId/dashboard`

Returns:

- Election details.
- Total votes.
- Candidate-wise vote counts and percentages.
- Sorted descending by votes.

Aggregation method:

- SQL aggregation via Sequelize `COUNT(id)` grouped by `candidateId`.

## 7. Security Model

### 7.1 One Vote Per User

Enforced in two places:

- Application check before insert.
- DB unique index on `votes(userId, electionId)`.

Even under concurrent requests, DB-level uniqueness prevents duplicates.

### 7.2 Token Verification

All protected operations depend on JWT verification middleware.

### 7.3 Password Safety

- Plain passwords are never stored.
- Passwords are hashed with bcrypt before save.

### 7.4 Admin Registration Key

If admin registration is requested, route checks:

- `ADMIN_REGISTRATION_KEY` exists in environment.
- `adminKey` in request matches it.

If not matched, account defaults to voter role.

## 8. Error Handling Strategy

File: `src/middleware/errorHandler.js`

- Uncaught route errors are forwarded to error middleware.
- Returns generic 500 error JSON for unknown failures.
- Specific known errors are returned directly by route handlers with meaningful status codes.

## 9. Environment Variables

Configure these in `.env` (based on `.env.example`):

- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `ADMIN_REGISTRATION_KEY` (optional but recommended)

## 10. End-to-End Testing Guide

This section explains how to test the entire backend from zero.

### 10.1 Prerequisites

- Node.js installed.
- MySQL running.
- Database created.

Create DB (example):

```sql
CREATE DATABASE matdaan_db;
```

### 10.2 Install and Start

From `server` directory:

```bash
npm install
```

Create `.env` from `.env.example`, fill your real values, then run:

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:5000/health
```

Expected:

```json
{"status":"ok"}
```

### 10.3 Test Flow (Recommended Order)

Follow this exact order for full backend validation.

#### Step 1: Register admin

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@test.com",
    "password": "Admin@123",
    "role": "admin",
    "adminKey": "<your_ADMIN_REGISTRATION_KEY>"
  }'
```

#### Step 2: Login admin and save token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin@123"
  }'
```

Copy `token` from response as `ADMIN_TOKEN`.

#### Step 3: Create election (admin)

Use dates that include current time for voting tests.

```bash
curl -X POST http://localhost:5000/api/elections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{
    "title": "Student Council 2026",
    "description": "Main campus election",
    "startDate": "2026-03-29T00:00:00.000Z",
    "endDate": "2026-12-31T23:59:59.000Z",
    "isActive": true
  }'
```

Copy returned election `id` as `ELECTION_ID`.

#### Step 4: Add candidates (admin)

```bash
curl -X POST http://localhost:5000/api/elections/<ELECTION_ID>/candidates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{
    "name": "Candidate A",
    "party": "Party Alpha",
    "manifesto": "Growth and transparency"
  }'
```

```bash
curl -X POST http://localhost:5000/api/elections/<ELECTION_ID>/candidates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{
    "name": "Candidate B",
    "party": "Party Beta",
    "manifesto": "Student-first governance"
  }'
```

Save candidate IDs as `CANDIDATE_1`, `CANDIDATE_2`.

#### Step 5: Register voter

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Voter One",
    "email": "voter1@test.com",
    "password": "Voter@123"
  }'
```

#### Step 6: Login voter and save token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "voter1@test.com",
    "password": "Voter@123"
  }'
```

Copy token as `VOTER_TOKEN`.

#### Step 7: Verify token endpoint

```bash
curl http://localhost:5000/api/auth/verify-token \
  -H "Authorization: Bearer <VOTER_TOKEN>"
```

Expected: `{ "valid": true, ... }`.

#### Step 8: List elections and candidates

```bash
curl http://localhost:5000/api/elections
```

```bash
curl http://localhost:5000/api/elections/<ELECTION_ID>/candidates
```

Confirm IDs and metadata.

#### Step 9: Cast vote (first time)

```bash
curl -X POST http://localhost:5000/api/votes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <VOTER_TOKEN>" \
  -d '{
    "electionId": <ELECTION_ID>,
    "candidateId": <CANDIDATE_1>
  }'
```

Expected status: `201` and success message.

#### Step 10: Attempt duplicate vote (security check)

Repeat Step 9 with same voter and election.

Expected status: `409` with message similar to "already voted".

#### Step 11: View results dashboard

```bash
curl http://localhost:5000/api/results/<ELECTION_ID>/dashboard
```

Verify:

- `totalVotes` is correct.
- Candidate vote counts and percentages are correct.
- Results are sorted by votes desc.

## 11. Negative Testing (Must Pass)

Run these to validate hardening:

1. Missing token on protected endpoint -> `401`.
2. Invalid token -> `401`.
3. Non-admin creating election/candidate -> `403`.
4. Vote for candidate not in election -> `404`.
5. Vote outside election window -> `400`.
6. Duplicate registration email -> `409`.
7. Wrong login password -> `401`.

## 12. Quick Test Matrix

- Auth:
  - Register voter: pass
  - Register admin without key: role should not elevate
  - Login: pass/fail cases
  - Verify token: pass/fail cases
- Elections:
  - Admin create election: pass
  - Voter create election: blocked
  - List elections: pass
- Candidates:
  - Admin add candidate: pass
  - Candidate listing by election: pass
- Voting:
  - First vote: pass
  - Second vote same user/election: blocked
  - Inactive/out-of-window election: blocked
- Results:
  - Aggregated counts and percentages accurate

## 13. Current Limitations and Improvements

Current backend is solid for development and project demos. For production-level readiness, consider:

1. Sequelize migrations and seeders.
2. Request schema validation (Joi or express-validator).
3. Rate limiting for auth and vote endpoints.
4. Refresh token flow and token revocation strategy.
5. Automated integration tests (Jest + Supertest + test DB).

## 14. File Map (For Code Reading)

- Entry and wiring: `index.js`
- DB connection: `src/config/database.js`
- Model graph: `src/models/index.js`
- Auth middleware: `src/middleware/auth.js`
- Error middleware: `src/middleware/errorHandler.js`
- Auth routes: `src/routes/authRoutes.js`
- Election + candidate routes: `src/routes/electionRoutes.js`
- Voting route: `src/routes/voteRoutes.js`
- Results route: `src/routes/resultRoutes.js`

This map is the fastest way to understand the full control flow from request to database.
