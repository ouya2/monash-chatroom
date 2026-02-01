import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./Room.module.scss";
import { normalizeRoomCode, roomExists, sendMessage, subscribeMessages } from "../lib/roomChat";
import { withTimeout } from '../lib/utils';

const LS_NAME = "monash_name";
const LS_ROOM = "monash_roomCode";
const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;
const MAX_MESSAGE_LENGTH = 400;

function formatTime(ts) {
  // Firestore Timestamp -> Date
  const d = ts?.toDate?.();
  if (!d) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Room() {
  const navigate = useNavigate();
  const { code: paramCode } = useParams();

  const code = useMemo(() => normalizeRoomCode(paramCode), [paramCode]);

  const isRoomCodeValid = useMemo(() => ROOM_CODE_REGEX.test(code), [code]);

  const [name, setName] = useState(() => localStorage.getItem(LS_NAME) || "");

  const [status, setStatus] = useState("loading"); // loading | ready | error | empty
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sendError, setSendError] = useState("");
  const [isSending, setIsSending] = useState(false);

  const trimmed = text.trim();
  const canSend = status !== "loading" && status !== "error" && trimmed.length > 0 && !isSending;

  const listRef = useRef(null);
  const initialScroll = useRef(false);
  const stickToBottomRef = useRef(null);

  useEffect(() => {
    if (!code) {
      return;
    }

    if (!isRoomCodeValid) {
      setStatus("error");
      setError("Invalid room code. Must be 6 characters A-Z or 0-9.");
    }
  }, [code, isRoomCodeValid]);

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
    const normalizedRoomCode = normalizeRoomCode(code);
    if (normalizedRoomCode) {
      localStorage.setItem(LS_ROOM, normalizedRoomCode);
    } else {
      localStorage.removeItem(LS_ROOM);
    }
  }, [code]);

  // Verify room exists + subscribe
  useEffect(() => {
    let unsub = null;
    let cancelled = false;

    if (!code) return;
    if (!isRoomCodeValid) return;

    async function boot() {
      setStatus("loading");
      setError("");

      try {
        const exists = await withTimeout(roomExists(code), 4000, "Room boot: roomExists timed out (offline?)");
        if (!exists) {
          localStorage.removeItem(LS_ROOM);
          setStatus("error");
          setError("Room not found.");
          return;
        }
        localStorage.setItem(LS_ROOM, code);
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

    if (code) boot().catch(() => {});

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [code, isRoomCodeValid]);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  // scroll to the bottom on initial load
  useEffect(() => {
    if (status !== "ready" && status !== "empty") return;
    if (initialScroll.current) return;

    requestAnimationFrame(() => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
        initialScroll.current = true;
      });  
    }, [status, messages.length]
  );
    
  useEffect(() => {
    stickToBottomRef.current = true;
    initialScroll.current = false;
    }, [code]
  );

  async function onSend(e) {
    e.preventDefault();

    if (!canSend) return;
    setSendError("");
    setIsSending(true);

    try {
      await withTimeout(sendMessage(code, name, trimmed), 5000, "Send message timed out");
      setText("");
      setSendError("");
    } catch (err) {
      setSendError(err?.message || "Failed to send. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  function exitRoom() {
    localStorage.removeItem(LS_ROOM);
    navigate("/", { replace: true });
  }

  function handleListScroll() {
    const el = listRef.current;
    if (!el) return;

    const threshold = 80; // px
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < threshold;
  }

  function groupMsgBySender(messages) {
    const groups = [];
    for (const m of messages) {
      const last = groups[groups.length - 1];
      const senderName = m.senderName || "Unknown";

      if (!last || last.senderName !== senderName) {
        groups.push({senderName, items: [m]});
      } else {
        last.items.push(m);
      }
    }
    return groups;
  }

  return (
    <div className={styles.page}>
      { status !== "error" && ( 
        <header className={styles.header}>
          <div className={styles.roomMeta}>
            <div className={styles.roomTitle}>Room {code}</div>
            <div className={styles.roomSub}>
              You are: <span className={styles.userName}>{name}</span>
            </div>
          </div>
          <button className={styles.leave} onClick={exitRoom}>
            ⟵ Leave
          </button>
        </header>
    )}

      <main className={styles.main}>
        {status === "loading" ? <div className={styles.state}>Loading…</div> : null}
        
        {status === "error" ? (
          <div className={styles.state}>
            <div className={styles.stateError}>{error || "Please try again."}</div>
            <div className={styles.stateActions}>
              <button className={styles.backBtn} onClick={exitRoom}>
                Back to Lobby
              </button>
            </div>
          </div>
        ) : null}

        {status === "empty" ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyHint}>No messages yet.</div> 
          </div>) : null}

        <div className={styles.list} ref={listRef} onScroll={handleListScroll}>
          {groupMsgBySender(messages).map((senderMsgGroup, gi) => {
            const first = senderMsgGroup.items[0];
            const last = senderMsgGroup.items[senderMsgGroup.items.length - 1];
            const groupKey = first?.id ?? `${senderMsgGroup.senderName}-${gi}`;

            return (
            <div key={groupKey} className={styles.group}>
              <div className={styles.groupHeader}>
                <span className={styles.sender}>{senderMsgGroup.senderName}</span>
                <span className={styles.time}>{formatTime(last?.createdAt)}</span>
              </div>

              <div className={styles.groupBody}>
              {senderMsgGroup.items.map((m, mi) => (
                <div key={m.id ?? `${groupKey}-${mi}`} className={styles.groupMsg}>
                  <div className={styles.text}>{m.text}</div>
                </div>
              ))}
             </div>
            </div>
            );
          })}
        </div>

        { status !== "error" && sendError ? (
          <div className={styles.sendError}>
            {sendError}
          </div>
        ) : null}

        <form className={styles.composer} onSubmit={onSend}>
          <input
            className={styles.input}
            value={text}
            onChange={(e) => {
              setSendError("");
              setText(e.target.value.slice(0, MAX_MESSAGE_LENGTH));
            }}
            placeholder="Type a message…"
            disabled={status === "loading" || status === "error"}
          />
          <div className={styles.counter}>
            {text.length}/{MAX_MESSAGE_LENGTH}
          </div>
          <button className={styles.send} type="submit" disabled={!canSend}>
            {isSending ? "Sending…" : "Send"}
          </button>
        </form>
      </main>
    </div>
  );
}