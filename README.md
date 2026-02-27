# Festival Planner

A web application for groups of friends to coordinate which acts to see at music festivals, featuring real-time synchronization of selections across group members.

## Features

- **Event Management**: Create festival events with multiple days, stages, and acts
- **Group Coordination**: Create groups, invite friends via shareable links, and see everyone's selections
- **Calendar View**: Visual timeline showing all stages and acts with selection indicators
- **Real-time Sync**: WebSocket-powered instant updates when group members make selections
- **Conflict Detection**: Automatic detection of overlapping act selections
- **Spotify Integration**: Search for artists when adding acts to auto-fill names and genres
- **Extended Hours**: Support for acts that run past midnight (e.g., 23:00-01:30)

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- TailwindCSS
- React Router
- Axios
- dayjs

**Backend:**
- Node.js + Express
- TypeScript
- SQLite (better-sqlite3)
- JWT Authentication
- WebSockets (ws)

## Project Structure

```
festival-planner/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API service layers
│   │   ├── context/        # React Context providers
│   │   └── types/          # TypeScript types
│   └── package.json
│
├── server/                 # Express Backend
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # API route definitions
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── db/             # Database setup
│   │   ├── websocket/      # WebSocket server
│   │   └── server.ts       # Entry point
│   └── package.json
│
└── shared/                 # Shared TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jasselhoff/festival-planner.git
   cd festival-planner
   ```

2. Install dependencies:
   ```bash
   # Install root dependencies
   npm install

   # Install client dependencies
   cd client && npm install

   # Install server dependencies
   cd ../server && npm install
   ```

3. Set up environment variables:
   ```bash
   # In server directory, create .env file
   cp .env.example .env
   ```

   Configure the following variables:
   ```env
   PORT=3001
   JWT_SECRET=your-secret-key
   JWT_REFRESH_SECRET=your-refresh-secret
   DATABASE_PATH=./data/festival_planner.db

   # Optional: Spotify integration
   SPOTIFY_CLIENT_ID=your-spotify-client-id
   SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
   ```

4. Start the development servers:
   ```bash
   # Terminal 1: Start the backend
   cd server && npm run dev

   # Terminal 2: Start the frontend
   cd client && npm run dev
   ```

5. Open http://localhost:5173 in your browser

## Docker

Build and run with Docker:

```bash
docker-compose up --build
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Events
- `GET /api/events` - List all events
- `POST /api/events` - Create event
- `GET /api/events/:id` - Get event details
- `GET /api/events/:id/full` - Get event with days/stages/acts
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Groups
- `GET /api/groups` - List user's groups
- `POST /api/groups` - Create group
- `GET /api/groups/:uuid` - Get group by UUID
- `POST /api/groups/join/:uuid` - Join group
- `POST /api/groups/:id/events` - Add event to group

### Selections
- `GET /api/groups/:groupId/selections` - Get all selections for group
- `POST /api/groups/:groupId/selections` - Add/update selection
- `DELETE /api/groups/:groupId/selections/:actId` - Remove selection

## License

MIT
