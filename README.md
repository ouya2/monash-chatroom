# Monash Room Chat — React + Vite + Firebase Firestore

A minimal **room-based realtime chat** app built for the Monash code challenge.

Users can:
- Enter a display name in the lobby
- Create a room (6-char code) or join an existing room
- Chat in realtime with others in the same room
- Refresh the page and automatically reconnect (via `localStorage`)

## Tech Stack

- React + Vite
- React Router
- Firebase Firestore (realtime)
- SCSS Modules (no UI library)

## How It Works

### Routes
- `/` → Lobby (enter name, create/join room)
- `/room/:code` → Room chat (realtime messages)

### Persistence & Reconnect
The app stores:
- `monash_name` (display name)
- `monash_roomCode` (room code)

in `localStorage` so a refresh returns you to the room.

### Firestore Data Model

Rooms and messages are stored **under the room**:

- `rooms/{ROOM_CODE}`
  - `createdAt` (server timestamp)
- `rooms/{ROOM_CODE}/messages/{MESSAGE_ID}`
  - `senderName` (string)
  - `text` (string)
  - `createdAt` (server timestamp)

Messages are subscribed in realtime, ordered by `createdAt`, and limited to the latest 100.

## Prerequisites

- Node.js **20 LTS** recommended
- A Firebase project with Firestore enabled

Check your versions:

```bash
node -v
npm -v
```
---

## Firebase Setup

### 1) Create Firebase Project
1. Go to Firebase Console
2. Create a new project (or use an existing one)
3. Add a **Web App** to get your Firebase config values

### 2) Enable Firestore
1. In Firebase Console → **Build** → **Firestore Database**
2. Click **Create database**

### 3) local development
1. Create a .env.local file in the project root:
2. Add your Firebase Web app config values:

```env
VITE_FIREBASE_APIKEY=your_api_key
VITE_FIREBASE_AUTHDOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECTID=your_project_id
VITE_FIREBASE_STORAGEBUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGINGSENDERID=your_sender_id
VITE_FIREBASE_APPID=your_app_id
```

3. Restart the dev server after editing .env.local:
```
npm run dev
```
