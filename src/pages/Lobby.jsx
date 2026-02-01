import {useEffect, useMemo, useState} from 'react';
import {useNavigate } from 'react-router-dom';
import styles from "./Lobby.module.scss";
import { createRoom, normalizeRoomCode, roomExists } from '../lib/roomChat';
import { withTimeout } from '../lib/utils';

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
  const [info, setInfo] = useState("");

  // Reconnect on refresh (auto-navigate into room if both values exist)
  useEffect(() => {
      let cancelled = false;
  
      async function reconnect() {
        setInfo?.("");
        setError?.("");
  
        const storedName = (localStorage.getItem(LS_NAME) || "").trim();
        const storedRoom = normalizeRoomCode(localStorage.getItem(LS_ROOM) || "");
        
        if (!storedName || !isValidCode(storedRoom)) {
          localStorage.removeItem(LS_ROOM);
          return;
        }
  
        try {
          const exists = await withTimeout(roomExists(storedRoom), 4000, "Lobby reconnect timed out");
          if (cancelled) return;
          if (exists) {
            navigate(`/room/${storedRoom}`, { replace: true });
          } else {
            localStorage.removeItem(LS_ROOM);
            setInfo?.("Previous room no longer exists. Create or join a new room.");
          }
        } catch {
          if (cancelled) return;
          setInfo?.("Failed to verify previous room (offline?). You can still create or join.");
        }
  
      }
  
      reconnect().catch(() => {});
      return () => {
        cancelled = true;
      };
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
      const exists = await withTimeout(roomExists(c), 4000, "Room check timed out when join (offline?)");
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
        <div className={styles.brand}>
          <div>
            <h1 className={styles.title}>Monash Chatroom</h1>
            <p className={styles.subtitle}>Create or join a room with a 6-character code.</p>
          </div>
        </div>
        <label className={styles.label}>Display name</label>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => persistName(e.target.value)}
          placeholder="e.g., Edison"
          disabled={busy}
        />
        <div className={styles.divider} />

        <div className={styles.actions}>
          <button className={styles.primary} onClick={onCreate} disabled={busy}>
            {busy ? "Working..." : "Create room"}
          </button>
          <div className={styles.or}>or</div>
          <div className={styles.joinRow}>
            <input
              className={styles.codeInput}
              value={normalizedCode}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Room Code"
              maxLength={6}    
              disabled={busy}
            />
            <button className={styles.secondary} onClick={onJoin} disabled={busy}>
              Join
            </button>
          </div>
        </div>

        {info ? <div className={styles.info}>{info}</div> : null}
      
        {error ? <div className={styles.error}>{error}</div> : null}
      </div>
    </div>
  );
}
