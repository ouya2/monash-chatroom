import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

const ROOM_CODE_LEN = 6;
const ROOM_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function normalizeRoomCode(input) {
  return (input || "").trim().toUpperCase();
}

export function generateRoomCode() {
  let out = "";
  for (let i = 0; i < ROOM_CODE_LEN; i += 1) {
    out += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
  }
  return out;
}

export async function roomExists(code) {
  const roomRef = doc(db, "rooms", code);
  const snap = await getDoc(roomRef);
  return snap.exists();
}

export async function createRoom(preferredCode) {
  // If preferredCode is provided, we try that; else generate until unused.
  let code = preferredCode || generateRoomCode();

  // Keep looping until we find an unused code.
  // For a code challenge, this is acceptable; collisions are extremely unlikely.
  // If you want to cap attempts, add a counter.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const roomRef = doc(db, "rooms", code);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) {
      await setDoc(roomRef, { createdAt: serverTimestamp() });
      return code;
    }
    code = generateRoomCode();
  }
}

export function subscribeMessages(code, onData, onError) {
  const msgsRef = collection(db, "rooms", code, "messages");
  const q = query(msgsRef, orderBy("createdAt", "asc"), limit(100));

  return onSnapshot(
    q,
    (snap) => {
      const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(messages);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export async function sendMessage(code, senderName, text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return;

  const msgsRef = collection(db, "rooms", code, "messages");
  await addDoc(msgsRef, {
    senderName,
    text: trimmed,
    createdAt: serverTimestamp(),
  });
}
