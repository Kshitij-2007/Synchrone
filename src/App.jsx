import { useCallback, useEffect, useRef, useState } from "react";
import { login, getSeats, reserveSeat, releaseSeat } from "./api";
import "./App.css";

const SEAT_LIMIT = 2;
const REFRESH_INTERVAL = 3000;
const LEAVE_TIMER_MS = 2 * 60 * 1000;
const LEAVE_TIMERS_KEY = "synergy_leave_timers";

function getSeatId(seat) {
  return seat.id ?? seat.seat_id ?? seat.seat_number;
}

function getSeatLabel(seat, index) {
  return seat.seat_number ?? seat.name ?? getSeatId(seat) ?? index + 1;
}

function isPhysicallyOccupied(seat) {
  return Boolean(seat.physically_occupied ?? seat.occupied);
}

function isReserved(seat) {
  return Boolean(seat.is_reserved ?? seat.user_id);
}

function isUnavailable(seat) {
  return isPhysicallyOccupied(seat) || isReserved(seat);
}

function displayName(user) {
  return (
    user?.name ??
    user?.username ??
    user?.email?.split("@")[0] ??
    "Student"
  );
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("library_user") || "null");
    } catch {
      return null;
    }
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [toast, setToast] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [busySeat, setBusySeat] = useState(null);
  const [confirmSeat, setConfirmSeat] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [leaveTimers, setLeaveTimers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LEAVE_TIMERS_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const [clockNow, setClockNow] = useState(Date.now());
  const expiringSeats = useRef(new Set());

  const previousOccupancy = useRef(null);
  const toastTimer = useRef(null);

  const notify = useCallback((title, message, type = "info") => {
    const notification = {
      id: `${Date.now()}-${Math.random()}`,
      title,
      message,
      type,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setNotifications((prev) => [notification, ...prev].slice(0, 12));
    setToast(notification);

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 4200);
  }, []);

  const refreshSeats = useCallback(async () => {
    try {
      const response = await getSeats();

      const seatData = Array.isArray(response)
        ? response
        : response?.seats ?? response?.data ?? [];

      const currentSeats = seatData.slice(0, SEAT_LIMIT);
      const previousSeats = previousOccupancy.current;

      if (previousSeats !== null) {
        currentSeats.forEach((seat, index) => {
          const id = getSeatId(seat);

          const oldSeat = previousSeats.find(
            (item, oldIndex) =>
              String(getSeatId(item) ?? oldIndex) === String(id ?? index)
          );

          if (!oldSeat) return;

          const wasOccupied = isPhysicallyOccupied(oldSeat);
          const nowOccupied = isPhysicallyOccupied(seat);

          if (wasOccupied !== nowOccupied) {
            const label = getSeatLabel(seat, index);
            const seatKey = String(id ?? index);

            notify(
              nowOccupied ? "Seat occupied" : "Seat is now empty",
              `Seat ${label}: physical occupancy ${
                nowOccupied ? "detected" : "no longer detected"
              }.`,
              nowOccupied ? "warning" : "success"
            );

            // Start the two-minute grace period only when a reserved,
            // previously occupied seat becomes physically empty.
            if (!nowOccupied && isReserved(seat)) {
  setLeaveTimers((current) => ({
    ...current,
    [seatKey]: Date.now() + LEAVE_TIMER_MS,
  }));

  notify(
    "Leave timer started",
    `Seat ${label} will be released in 2 minutes if you do not return.`,
    "warning"
  );
}

            // Returning to the seat cancels its leave timer.
            if (nowOccupied) {
              setLeaveTimers((current) => {
                if (!current[seatKey]) return current;
                const next = { ...current };
                delete next[seatKey];
                return next;
              });
            }
          }
        });
      }

      previousOccupancy.current = currentSeats;
      setSeats(currentSeats);
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      setError(
        err?.message ||
          "Unable to load seats. Check that the backend is running."
      );
    }
  }, [notify]);

useEffect(() => {
  seats.forEach((seat) => {
    const seatId = String(getSeatId(seat));

    if (
      isReserved(seat) &&
      !isPhysicallyOccupied(seat) &&
      !leaveTimers[seatId]
    ) {
      setLeaveTimers((current) => ({
        ...current,
        [seatId]: Date.now() + LEAVE_TIMER_MS,
      }));
    }
  });
}, [seats, leaveTimers]);

  useEffect(() => {
    localStorage.setItem(LEAVE_TIMERS_KEY, JSON.stringify(leaveTimers));
  }, [leaveTimers]);

  useEffect(() => {
    const interval = setInterval(() => setClockNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;

    Object.entries(leaveTimers).forEach(async ([seatKey, deadline]) => {
      if (deadline > clockNow || expiringSeats.current.has(seatKey)) return;

      const seat = seats.find(
        (item, index) => String(getSeatId(item) ?? index) === seatKey
      );

      // Do not release a seat if the sensor has detected the student again.
      if (seat && isPhysicallyOccupied(seat)) {
        setLeaveTimers((current) => {
          const next = { ...current };
          delete next[seatKey];
          return next;
        });
        return;
      }

      expiringSeats.current.add(seatKey);
      try {
        if (seat && isReserved(seat)) {
          await releaseSeat(getSeatId(seat));
          notify(
            "Leave timer expired",
            `Seat ${getSeatLabel(seat, seats.indexOf(seat))} is now available.`,
            "success"
          );
        }
        setLeaveTimers((current) => {
          const next = { ...current };
          delete next[seatKey];
          return next;
        });
        await refreshSeats();
      } catch (err) {
        notify(
          "Automatic release failed",
          err?.message || "Could not release the seat. Please refresh and try again.",
          "warning"
        );
        // Prevent a rapid retry loop; allow another attempt after 3 seconds.
        setTimeout(() => expiringSeats.current.delete(seatKey), REFRESH_INTERVAL);
      } finally {
        if (!leaveTimers[seatKey] || !seats.some(
          (item, index) => String(getSeatId(item) ?? index) === seatKey && isReserved(item)
        )) {
          expiringSeats.current.delete(seatKey);
        }
      }
    });
  }, [clockNow, leaveTimers, seats, user, notify, refreshSeats]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login(email, password);

      const loggedInUser =
        result?.user ?? result?.data?.user ?? result?.data ?? result;

      if (!loggedInUser) {
        throw new Error("The login response did not contain user data.");
      }

      const token = result?.access_token ?? result?.data?.access_token;

      if (token) {
        localStorage.setItem("access_token", token);
      }

      localStorage.setItem("library_user", JSON.stringify(loggedInUser));

      setUser(loggedInUser);
      previousOccupancy.current = null;

      notify(
        "Welcome back",
        "You have signed in successfully.",
        "success"
      );
    } catch (err) {
      setError(err?.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("library_user");
    localStorage.removeItem("access_token");

    setUser(null);
    setSeats([]);
    previousOccupancy.current = null;
    setError("");
    setToast(null);
    setConfirmSeat(null);
    setLeaveTimers({});
  }

  async function confirmReservation() {
    const seat = confirmSeat;

    if (!seat) return;

    const seatId = getSeatId(seat);

    if (seatId == null) {
      setError("This seat does not have a valid ID.");
      setConfirmSeat(null);
      return;
    }

    if (isUnavailable(seat)) {
      notify(
        "Seat unavailable",
        "This seat is occupied or already reserved.",
        "warning"
      );

      setConfirmSeat(null);
      return;
    }

    setBusySeat(seatId);
    setConfirmSeat(null);
    setError("");

    try {
      await reserveSeat(seatId);

      notify(
        "Seat reserved",
        `Seat ${getSeatLabel(seat, 0)} was reserved successfully.`,
        "success"
      );

      await refreshSeats();
    } catch (err) {
      setError(err?.message || "Unable to reserve this seat.");
    } finally {
      setBusySeat(null);
    }
  }

  async function handleRelease(seat) {
    const seatId = getSeatId(seat);

    if (seatId == null) {
      setError("This seat does not have a valid ID.");
      return;
    }

    setBusySeat(seatId);
    setError("");

    try {
      await releaseSeat(seatId);
      setLeaveTimers((current) => {
        const next = { ...current };
        delete next[String(seatId)];
        return next;
      });

      notify(
        "Reservation released",
        `Seat ${getSeatLabel(seat, 0)} is no longer reserved by you.`,
        "success"
      );

      await refreshSeats();
    } catch (err) {
      setError(err?.message || "Unable to release this reservation.");
    } finally {
      setBusySeat(null);
    }
  }

  const occupiedCount = seats.filter(isPhysicallyOccupied).length;
  const reservedCount = seats.filter(isReserved).length;

  const availableCount = seats.filter(
    (seat) => !isUnavailable(seat)
  ).length;

  const ownReservations = seats.filter(
    (seat) =>
      user?.id != null && String(seat.user_id) === String(user.id)
  ).length;

  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 17
        ? "Good afternoon"
        : "Good evening";

  if (!user) {
    return (
      <main className="login-page">
        <section className="login-story">
          <div className="login-brand">
  <img
    src="/synergy_favicon.png"
    alt="Synergy logo"
    className="brand-symbol"
  />

  <span className="brand-name">
    SYNERGY
    <small>SMART LIBRARY</small>
  </span>
</div>

          <div className="story-copy">
            <span className="story-kicker">
              <i /> SMARTER STUDY SPACES
            </span>

            <h1>
              Your Library.
              <br />
              <em>Smarter.</em>
            </h1>

            <p>
              A calmer, smarter way to find your place, reserve your seat,
              and focus on what matters.
            </p>
          </div>

          <div className="story-bottom">
            <span className="story-orbit orbit-one" />
            <span className="story-orbit orbit-two" />

            <div className="story-metric">
              <span className="metric-icon">✦</span>

              <div>
                <strong>Made for focus.</strong>
                <small>Your next study session starts here.</small>
              </div>
            </div>

            <span className="story-caption">A BETTER WAY TO STUDY</span>
          </div>

          <div className="login-story-footer">
            <span>Designed for your campus</span>
            <span>01 — SMART SEATING</span>
          </div>
        </section>

        <section className="login-side">
          <div className="login-side-top">
            <span>STUDENT PORTAL</span>

            <span className="secure-label">
              <i /> SECURE SIGN IN
            </span>
          </div>

          <div className="login-card">
            <div className="mobile-brand">
              <img src="/synergy_favicon.png" alt="Synergy logo" />
              <span>SYNERGY</span>
            </div>

            <div className="form-icon">↗</div>

            <p className="form-eyebrow">WELCOME BACK</p>
            <h2>Sign in to Synergy</h2>

            <p className="form-intro">
              Access your smart library dashboard.
            </p>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            <form className="login-form" onSubmit={handleLogin}>
              <label htmlFor="email">Email address</label>

              <div className="input-wrap">
                <span>✉</span>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  autoComplete="email"
                  required
                />
              </div>

              <label htmlFor="password">Password</label>

              <div className="input-wrap">
                <span>⌑</span>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                className="primary-button login-button"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  "Signing in…"
                ) : (
                  <>
                    Sign in <span>↗</span>
                  </>
                )}
              </button>
            </form>

            <div className="login-help">
              <span className="help-lock">⌑</span>
              <span>Your campus account keeps your sessions secure.</span>
            </div>
          </div>

          <div className="login-side-footer">
            <span>© {new Date().getFullYear()} Synergy Smart Library</span>
            <span>Need help? Contact your library team</span>
          </div>
        </section>

        {toast && (
          <Toast toast={toast} onDismiss={() => setToast(null)} />
        )}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
  <img
    src="/synergy_favicon.png"
    alt="Synergy logo"
    className="sidebar-logo"
  />

  <div>
    <strong>SYNERGY</strong>
    <small>SMART LIBRARY</small>
  </div>
</div>

        <div className="nav-caption">WORKSPACE</div>

        <nav className="side-nav">
          <a className="nav-item active" href="#dashboard">
            <span className="nav-icon">▦</span>
            <span>Dashboard</span>
            <span className="nav-active-mark" />
          </a>

          <a className="nav-item" href="#seats">
            <span className="nav-icon">⌑</span>
            <span>Seat availability</span>
          </a>

          <a className="nav-item" href="#activity">
            <span className="nav-icon">◷</span>
            <span>Recent activity</span>
          </a>
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-status">
          <span className="status-pulse" />

          <div>
            <strong>System operational</strong>
            <small>Live monitoring enabled</small>
          </div>
        </div>

        <div className="sidebar-bottom">
          <span className="sidebar-campus-icon">⌂</span>

          <div>
            <strong>Campus Library</strong>
            <small>Student access</small>
          </div>
        </div>
      </aside>

      <div className="main-area" id="dashboard">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <b>/</b>
            <strong>Dashboard</strong>
          </div>

          <div className="topbar-right">
            <div className="system-pill">
              <span className="status-pulse" />
              All systems operational
            </div>

            <div className="topbar-divider" />

            <div className="profile-block">
              <div className="user-avatar">
                {displayName(user).charAt(0).toUpperCase()}
              </div>

              <div className="user-details">
                <strong>{displayName(user)}</strong>
                <span>Student account</span>
              </div>
            </div>

            <button
              className="logout-button"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
            >
              ↗
            </button>
          </div>
        </header>

        <section className="dashboard">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">YOUR CAMPUS · SMART LIBRARY</p>

              <h1>
                {greeting}, {displayName(user).split(" ")[0]}
                <span className="welcome-period">.</span>
              </h1>

              <p className="welcome-subtitle">
                Your smart library, at a glance.
              </p>
            </div>

            <button
              className="secondary-button refresh-button"
              onClick={refreshSeats}
            >
              <span>↻</span> Refresh data
            </button>
          </div>

          <section className="stats-grid" aria-label="Seat statistics">
            <StatCard
              icon="▦"
              label="Total seats"
              value={seats.length}
              detail="Connected to the system"
              tone="purple"
            />

            <StatCard
              icon="✓"
              label="Available"
              value={availableCount}
              detail="Ready to reserve"
              tone="green"
            />

            <StatCard
              icon="▣"
              label="Reserved"
              value={reservedCount}
              detail={`${ownReservations} reserved by you`}
              tone="blue"
            />

            <StatCard
              icon="◉"
              label="Occupied"
              value={occupiedCount}
              detail="Physical presence detected"
              tone="orange"
            />
          </section>

          {error && (
            <div
              className="error-message dashboard-error"
              role="alert"
            >
              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          <div className="content-grid">
            <section className="panel seats-panel" id="seats">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">FIND YOUR PLACE</span>
                  <h2>Seat availability</h2>

                  <p className="muted">
                    Choose a space for your next study session.
                  </p>
                </div>

                <span className="live-indicator">
                  <span className="live-dot" /> Live updates
                </span>
              </div>

              <div className="legend">
                <span>
                  <i className="legend-dot available-dot" /> Available
                </span>

                <span>
                  <i className="legend-dot occupied-dot" /> Occupied
                </span>

                <span>
                  <i className="legend-dot reserved-dot" /> Reserved
                </span>
              </div>

              {seats.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">▦</div>
                  <h3>No seats found</h3>

                  <p>
                    The API returned no seats. Check your backend and seat
                    records, then refresh.
                  </p>

                  <button
                    className="primary-button"
                    onClick={refreshSeats}
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div className="seat-grid">
                  {seats.map((seat, index) => {
                    const seatId = getSeatId(seat);
                    const occupied = isPhysicallyOccupied(seat);
                    const reserved = isReserved(seat);
                    const unavailable = isUnavailable(seat);

                    const mine =
                      user.id != null &&
                      String(seat.user_id) === String(user.id);

                    const seatKey = String(seatId ?? index);
                    const leaveDeadline = leaveTimers[seatKey];
                    const remainingSeconds = leaveDeadline
                      ? Math.max(0, Math.ceil((leaveDeadline - clockNow) / 1000))
                      : null;
                    const unauthorized = occupied && !reserved;

                    let status = "Available";
                    let statusClass = "available";

                    if (unauthorized) {
                      status = "Unauthorized";
                      statusClass = "unauthorized";
                    } else if (occupied) {
                      status = "Occupied";
                      statusClass = "occupied";
                    } else if (reserved && remainingSeconds !== null) {
                      status = "Returning soon";
                      statusClass = "reserved";
                    } else if (reserved) {
                      status = mine ? "Reserved by you" : "Reserved";
                      statusClass = "reserved";
                    }

                    return (
                      <article
                        className="seat-card"
                        key={seatId ?? index}
                      >
                        <div className="seat-card-top">
                          <div className="seat-title-wrap">
                            <span className="seat-icon">⌑</span>

                            <div>
                              <span className="seat-overline">
                                STUDY SPACE
                              </span>

                              <h3>Seat {getSeatLabel(seat, index)}</h3>
                            </div>
                          </div>

                          <span className={`status-pill ${statusClass}`}>
                            <i />
                            {status}
                          </span>
                        </div>

                        <div className={`seat-visual ${statusClass}`}>
                          <div className="seat-glow" />
                          <div className="chair-back" />
                          <div className="chair-seat" />
                          <div className="chair-leg left-leg" />
                          <div className="chair-leg right-leg" />

                          <span className="seat-visual-label">
                            {unauthorized
                              ? "UNAUTHORIZED"
                              : occupied
                                ? "IN USE"
                                : reserved && remainingSeconds !== null
                                  ? "LEAVE TIMER"
                                  : reserved
                                    ? "RESERVED"
                                    : "READY FOR YOU"}
                          </span>
                        </div>

                        <p className="seat-description">
                          {unauthorized
                            ? "Occupancy detected without a reservation. Please notify library staff."
                            : occupied
                              ? "Presence detected by the occupancy sensor."
                              : reserved && remainingSeconds !== null
                                ? `Return within ${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")} or this seat will be released.`
                                : reserved
                                  ? "This study space currently has a reservation."
                                  : "A quiet place to settle in and focus."}
                        </p>

                        {reserved && remainingSeconds !== null && (
                          <div
                            className={`leave-timer ${remainingSeconds <= 15 ? "urgent" : ""}`}
                            role="status"
                            aria-live="polite"
                          >
                            <span>⏱ Leave timer</span>
                            <strong>
                              {Math.floor(remainingSeconds / 60)}:
                              {String(remainingSeconds % 60).padStart(2, "0")}
                            </strong>
                          </div>
                        )}

                        {mine ? (
                          <button
                            className="secondary-button seat-action"
                            disabled={busySeat === seatId}
                            onClick={() => handleRelease(seat)}
                          >
                            {busySeat === seatId
                              ? "Processing…"
                              : "Release reservation"}
                          </button>
                        ) : (
                          <button
                            className="primary-button seat-action"
                            disabled={
                              unavailable || busySeat === seatId
                            }
                            onClick={() => setConfirmSeat(seat)}
                          >
                            {busySeat === seatId ? (
                              "Processing…"
                            ) : unavailable ? (
                              "Not available"
                            ) : (
                              <>
                                Reserve seat <span>↗</span>
                              </>
                            )}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}

              <div className="last-updated">
                <span className="live-dot" />

                {lastUpdated
                  ? `Last synced at ${lastUpdated.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}`
                  : "Waiting for the first update…"}

                <span className="refresh-note">
                  Auto-refresh every 3 seconds
                </span>
              </div>
            </section>

            <aside className="panel activity-panel" id="activity">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">WHAT'S HAPPENING</span>
                  <h2>Recent activity</h2>

                  <p className="muted">
                    Latest seat and reservation updates.
                  </p>
                </div>

                <span className="activity-count">
                  {notifications.length}
                </span>
              </div>

              {notifications.length === 0 ? (
                <div className="activity-empty">
                  <span className="activity-icon">◷</span>
                  <p>All quiet for now</p>
                  <span>
                    Seat and reservation updates will appear here.
                  </span>
                </div>
              ) : (
                <div className="activity-list">
                  {(showHistory
                    ? notifications
                    : notifications.slice(0, 4)
                  ).map((item) => (
                    <article className="activity-item" key={item.id}>
                      <span
                        className={`activity-marker ${item.type}`}
                      />

                      <div className="activity-copy">
                        <strong>{item.title}</strong>
                        <p>{item.message}</p>
                        <time>{item.time}</time>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {notifications.length > 4 && (
                <button
                  className="history-button"
                  onClick={() => setShowHistory((v) => !v)}
                >
                  {showHistory ? "Show less" : "View complete history"}
                  <span>↗</span>
                </button>
              )}

              <div className="sensor-note">
                <div className="sensor-icon">⌁</div>

                <div>
                  <strong>Live seat monitoring</strong>

                  <p>
                    Seat status refreshes automatically from the library
                    system. Occupancy changes appear here as they are
                    detected.
                  </p>
                </div>
              </div>
            </aside>
          </div>

          <footer className="app-footer">
            <span>
              <b>SYNERGY</b> · SMART LIBRARY
            </span>

            <span>
              {lastUpdated
                ? "System synced"
                : "Connecting to library system"}{" "}
              <i className="live-dot" />
            </span>
          </footer>
        </section>
      </div>

      {confirmSeat && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmSeat(null);
            }
          }}
        >
          <section
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <button
              className="modal-close"
              onClick={() => setConfirmSeat(null)}
              aria-label="Close dialog"
            >
              ×
            </button>

            <div className="modal-icon">⌑</div>
            <span className="section-kicker">SEAT RESERVATION</span>

            <h2 id="confirm-title">Make it your space?</h2>

            <p className="modal-copy">
              You're about to reserve{" "}
              <strong>Seat {getSeatLabel(confirmSeat, 0)}</strong>.
              Confirm to continue with your study session.
            </p>

            <div className="modal-seat-summary">
              <span className="summary-seat-icon">⌑</span>

              <div>
                <strong>Seat {getSeatLabel(confirmSeat, 0)}</strong>
                <small>Smart Library · Study space</small>
              </div>

              <span className="status-pill available">
                <i />
                Available
              </span>
            </div>

            <button
              className="primary-button modal-confirm"
              onClick={confirmReservation}
            >
              Confirm reservation <span>↗</span>
            </button>

            <button
              className="modal-cancel"
              onClick={() => setConfirmSeat(null)}
            >
              No, go back
            </button>
          </section>
        </div>
      )}

      {toast && (
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      )}
    </main>
  );
}

function StatCard({ icon, label, value, detail, tone = "" }) {
  return (
    <article className={`stat-card ${tone}`}>
      <span className="stat-icon">{icon}</span>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">{detail}</span>
    </article>
  );
}

function Toast({ toast, onDismiss }) {
  return (
    <div
      className={`toast-notification toast-${toast.type}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast-symbol">
        {toast.type === "success"
          ? "✓"
          : toast.type === "warning"
            ? "!"
            : "i"}
      </span>

      <div className="toast-copy">
        <strong>{toast.title}</strong>
        <p>{toast.message}</p>
      </div>

      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}

export default App;