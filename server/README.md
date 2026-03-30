# Matdaan Backend (Node.js + MySQL + Sequelize)

Detailed architecture and full testing walkthrough:

- `BACKEND_IN_DEPTH_AND_TESTING.md`

## Features
- Election creation (admin)
- Candidate listing and management
- Secure voting API
- One vote per user per election
- Token verification via JWT
- Vote counting and results dashboard

## Setup
1. Install dependencies:
   npm install
2. Copy environment file:
   - Windows (PowerShell): `Copy-Item .env.example .env`
   - Linux/macOS: `cp .env.example .env`
3. Update `.env` with your MySQL credentials.
4. Start server:
   npm run dev

## API Endpoints

### Auth
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/verify-token`

### Elections
- POST `/api/elections` (admin)
- GET `/api/elections`
- POST `/api/elections/:electionId/candidates` (admin)
- GET `/api/elections/:electionId/candidates`

### Voting
- POST `/api/votes`

### Results
- GET `/api/results/:electionId/dashboard`

## Notes
- JWT token must be sent in header: `Authorization: Bearer <token>`.
- Voting is only allowed when election is active and within the date window.
- A unique index on `(userId, electionId)` enforces one vote per user.
- Admin registration is locked unless `ADMIN_REGISTRATION_KEY` is configured and passed as `adminKey` in register API.
