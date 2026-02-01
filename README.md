# Monash Room Chat — React + Vite + Firebase Firestore

A minimal **room-based realtime chat** app built for the Monash code challenge.

Users can:
- Enter a display name in the lobby
- Create a room (6-char code) or join an existing room
- Chat in realtime with others in the same room
- Refresh the page and automatically reconnect (via `localStorage`)

## Run Locally

1. Install dependencies:
```bash
npm install
```
2. Create `.env.local` (see Firebase setup below)
3. Start dev server:
```bash
npm run dev
```
4. Production build/preview
```bash
npm run build
npm run preview
```

## Tech Stack

- React + Vite
- React Router
- Firebase Firestore (realtime)
- SCSS Modules (no UI library)

## How It Works

### Routes
- `/` → Lobby (enter name, create/join room)
- `/room/:code` → Room chat (realtime messages)

### Room Code Rules
- Room codes are exactly 6 characters: `A-Z` and `0-9` (`^[A-Z0-9]{6}$`)
- Inputs are normalised to uppercase.
- The room route validates the code and shows a single "Back to Lobby" action on error.

### Reconnect + Leave

- `localStorage` stores keys:
  - `monash_name`
  - `monash_roomCode`
- On Lobby load, if both keys exist the app verifies the room still exists (`roomExists`) and navigates back into it.
- “Leave” clears `monash_roomCode` so returning to Lobby does not immediately redirect back into the room.
- Network calls are wrapped with a small timeout to avoid indefinite “Loading…” / “Sending…” when offline.


### Firestore Data Model

Rooms and messages are stored **under the room**:

- `rooms/{ROOM_CODE}`
  - `createdAt` (server timestamp)
- `rooms/{ROOM_CODE}/messages/{MESSAGE_ID}`
  - `senderName` (string)
  - `text` (string)
  - `createdAt` (server timestamp)

- Messages are subscribed in realtime, ordered by `createdAt`, and limited to the latest 100.
- Message length is capped at 400 characters.

### Firestore Security Rules

This challenge app uses display-name-only identity (no Firebase Auth). For a production app you would typically require authentication and enforce stricter Firestore rules.

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

### 3) Local Development
1. Create a `.env.local` file in the project root:
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
