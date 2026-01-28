import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./Room.module.scss";
import { normalizeRoomCode, roomExists, sendMessage, subscribeMessages } from "../lib/roomChat";

const LS_NAME = "monash_name";
const LS_ROOM = "monash_roomCode";

function fmtTime(ts) {
  // Firestore Timestamp -> Date
  const d = ts?.toDate?.();
  if (!d) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Room() {
  const navigate = useNavigate();
  const { code: paramCode } = useParams();

  const code = useMemo(() => normalizeRoomCode(paramCode), [paramCode]);
  const [name, setName] = useState(() => localStorage.getItem(LS_NAME) || "");

  const [status, setStatus] = useState("loading"); // loading | ready | error | empty
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const listRef = useRef(null);

  // Guard: if name missing, go back to lobby
  useEffect(() => {
    const storedName = localStorage.getItem(LS_NAME);
    if (!storedName) {
      navigate("/", { replace: true });
      return;
    }
    setName(storedName);
  }, [navigate]);

  // Persist room code for reconnect
  useEffect(() => {
    if (code) localStorage.setItem(LS_ROOM, code);
  }, [code]);

  // Verify room exists + subscribe
  useEffect(() => {
    let unsub = null;
    let cancelled = false;

    async function boot() {
      setStatus("loading");
      setError("");

      try {
        const exists = await roomExists(code);
        if (!exists) {
          setStatus("error");
          setError("Room not found.");
          return;
        }

        unsub = subscribeMessages(
          code,
          (msgs) => {
            if (cancelled) return;
            setMessages(msgs);
            setStatus(msgs.length ? "ready" : "empty");
          },
          (err) => {
            if (cancelled) return;
            setStatus("error");
            setError(err?.message || "Failed to load messages.");
          }
        );
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setError(e?.message || "Failed to load room.");
      }
    }

    if (code) boot();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [code]);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function onSend(e) {
    e.preventDefault();
    try {
      await sendMessage(code, name, text);
      setText("");
    } catch (err) {
      setError(err?.message || "Failed to send.");
    }
  }

  function onLeave() {
    localStorage.removeItem(LS_ROOM);
    navigate("/", { replace: true });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.roomMeta}>
          <div className={styles.roomTitle}>Room {code}</div>
          <div className={styles.roomSub}>You are: {name}</div>
        </div>
        <button className={styles.leave} onClick={onLeave}>
          Leave
        </button>
      </header>

      <main className={styles.main}>
        {status === "loading" ? <div className={styles.state}>Loading…</div> : null}
        {status === "error" ? <div className={styles.state}>{error || "Something went wrong."}</div> : null}
        {status === "empty" ? <div className={styles.state}>No messages yet. Say hi 👋</div> : null}

        <div className={styles.list} ref={listRef}>
          {messages.map((m) => (
            <div key={m.id} className={styles.msg}>
              <div className={styles.msgTop}>
                <span className={styles.sender}>{m.senderName || "Unknown"}</span>
                <span className={styles.time}>{fmtTime(m.createdAt)}</span>
              </div>
              <div className={styles.text}>{m.text}</div>
            </div>
          ))}
        </div>
      </main>

      <form className={styles.composer} onSubmit={onSend}>
        <input
          className={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          disabled={status === "loading" || status === "error"}
        />
        <button className={styles.send} type="submit" disabled={!text.trim() || status === "loading" || status === "error"}>
          Send
        </button>
      </form>
    </div>
  );
}