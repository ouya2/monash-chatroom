import {useEffect, useMemo, useState} from 'react';
import {useNavigate } from 'react-router-dom';
import styles from "./Lobby.module.scss";
import { createRoom, normalizeRoomCode, roomExists } from '../lib/roomChat';

const LS_NAME = "monash_name";
const LS_ROOM = "monash_roomCode";

function isValidName(name) {
  return (name || "").trim().length >= 2;
}
function isValidCode(code) {
  return /^[A-Z0-9]{6}$/.test(code || "");
}

export default function Lobby() {
  const navigate = useNavigate();

  const [name, setName] = useState(() => localStorage.getItem(LS_NAME) || "");
  const [code, setCode] = useState(() => localStorage.getItem(LS_ROOM) || "");
  const normalizedCode = useMemo(() => normalizeRoomCode(code), [code]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Reconnect on refresh (auto-navigate into room if both values exist)
  useEffect(() => {
    const storedName = localStorage.getItem(LS_NAME);
    const storedRoom = localStorage.getItem(LS_ROOM);
    if (storedName && storedRoom && isValidCode(storedRoom)) {
      navigate(`/room/${storedRoom}`, { replace: true });
    }
  }, [navigate]);

  function persistName(next) {
    setName(next);
    localStorage.setItem(LS_NAME, next);
  }

  async function onCreate() {
    setError("");
    if (!isValidName(name)) return setError("Name must be at least 2 characters.");
    setBusy(true);
    try {
      localStorage.setItem(LS_NAME, name.trim());
      const newCode = await createRoom();
      localStorage.setItem(LS_ROOM, newCode);
      navigate(`/room/${newCode}`);
    } catch (e) {
      setError(e?.message || "Failed to create room.");
    } finally {
      setBusy(false);
    }
  }

  async function onJoin() {
    setError("");
    if (!isValidName(name)) return setError("Name must be at least 2 characters.");
    const c = normalizeRoomCode(code);
    if (!isValidCode(c)) return setError("Room code must be exactly 6 chars A–Z/0–9.");
    setBusy(true);
    try {
      const exists = await roomExists(c);
      if (!exists) return setError("Room not found. Check the code or create a new room.");
      localStorage.setItem(LS_NAME, name.trim());
      localStorage.setItem(LS_ROOM, c);
      navigate(`/room/${c}`);
    } catch (e) {
      setError(e?.message || "Failed to join room.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Monash Chatroom</h1>
        <p className={styles.sub}>Enter your name, then create or join a room.</p>

        <label className={styles.label}>
          Display name
          <input
            className={styles.input}
            value={name}
            onChange={(e) => persistName(e.target.value)}
            placeholder="e.g., Edison"
            disabled={busy}
          />
        </label>

        <label className={styles.label}>
          Room code
          <input
            className={styles.input}
            value={normalizedCode}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ABC123"
            maxLength={6}
            disabled={busy}
          />
        </label>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.actions}>
          <button className={styles.primary} onClick={onCreate} disabled={busy}>
            {busy ? "Working..." : "Create room"}
          </button>
          <button className={styles.secondary} onClick={onJoin} disabled={busy}>
            Join room
          </button>
        </div>

        <div className={styles.hint}>
          Tip: Open a second tab to test realtime messages quickly.
        </div>
      </div>
    </div>
  );
}
