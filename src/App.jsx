
import { useCallback, useEffect, useRef, useState } from "react";
import { login, getSeats, reserveSeat, releaseSeat } from "./api";
import "./App.css";

const SEAT_LIMIT = 2;
const REFRESH_INTERVAL = 3000;

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

    setNotifications((previous) =>
      [notification, ...previous].slice(0, 8)
    );

    setToast(notification);

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 4500);
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
              String(getSeatId(item) ?? oldIndex) ===
              String(id ?? index)
          );

          if (!oldSeat) return;

          const wasOccupied = isPhysicallyOccupied(oldSeat);
          const nowOccupied = isPhysicallyOccupied(seat);

          if (wasOccupied !== nowOccupied) {
            const label = getSeatLabel(seat, index);

            notify(
              nowOccupied ? "Seat occupied" : "Seat is now empty",
              `Seat ${label}: physical occupancy ${
                nowOccupied ? "detected" : "no longer detected"
              } by the ESP32.`,
              nowOccupied ? "warning" : "success"
            );
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
    if (!user) {
      previousOccupancy.current = null;
      return;
    }

    refreshSeats();

    const interval = setInterval(refreshSeats, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [user, refreshSeats]);

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

      // Supports APIs that return either a user object or a
      // response containing a user and/or an access token.
      const loggedInUser =
        result?.user ??
        result?.data?.user ??
        result?.data ??
        result;

      if (!loggedInUser) {
        throw new Error("The login response did not contain user data.");
      }

      if (result?.access_token) {
        localStorage.setItem("access_token", result.access_token);
      } else if (result?.data?.access_token) {
        localStorage.setItem(
          "access_token",
          result.data.access_token
        );
      }

      localStorage.setItem("library_user", JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      previousOccupancy.current = null;

      notify("Welcome!", "You have logged in successfully.", "success");
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
  }

  async function handleReserve(seat) {
    const seatId = getSeatId(seat);

    if (seatId == null) {
      setError("This seat does not have a valid ID.");
      return;
    }

    if (isUnavailable(seat)) {
      notify(
        "Seat unavailable",
        "This seat is occupied or already reserved.",
        "warning"
      );
      return;
    }

    setBusySeat(seatId);
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

  if (!user) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="brand-mark">SL</div>
          <p className="eyebrow">SMART LIBRARY</p>
          <h1>Welcome back</h1>
          <p className="muted">
            Sign in to view and reserve library seats.
          </p>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

            <button
              className="primary-button login-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="login-footnote">
            Smart seating powered by ESP32 occupancy monitoring
          </p>
        </section>

        {toast && (
          <Toast
            toast={toast}
            onDismiss={() => setToast(null)}
          />
        )}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark small-mark">SL</div>
          <div>
            <strong>Smart Library</strong>
            <span>Seat reservation system</span>
          </div>
        </div>

        <div className="user-area">
          <div className="user-avatar">
            {(user.name ?? user.username ?? user.email ?? "U")
              .charAt(0)
              .toUpperCase()}
          </div>
          <div className="user-details">
            <strong>{user.name ?? user.username ?? "Library user"}</strong>
            <span>{user.email ?? ""}</span>
          </div>
          <button className="secondary-button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <section className="dashboard">
        <div className="welcome-row">
          <div>
            <p className="eyebrow">YOUR LIBRARY DASHBOARD</p>
            <h1>Find your seat.</h1>
            <p className="muted">
              Check live occupancy and manage your reservation.
            </p>
          </div>

          <button
            className="secondary-button refresh-button"
            onClick={refreshSeats}
          >
            ↻ Refresh seats
          </button>
        </div>

        <section className="stats-grid" aria-label="Seat statistics">
          <StatCard
            label="Total seats shown"
            value={seats.length}
            detail="Monitored seats"
          />
          <StatCard
            label="Available"
            value={availableCount}
            detail="Ready to reserve"
            tone="green"
          />
          <StatCard
            label="Physically occupied"
            value={occupiedCount}
            detail="Reported by ESP32"
            tone="orange"
          />
          <StatCard
            label="Reserved"
            value={reservedCount}
            detail="Reservation records"
            tone="blue"
          />
        </section>

        {error && (
          <div className="error-message dashboard-error" role="alert">
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
          <section className="panel seats-panel">
            <div className="panel-heading">
              <div>
                <h2>Seat availability</h2>
                <p className="muted">
                  Live updates every {REFRESH_INTERVAL / 1000} seconds
                </p>
              </div>
              <span className="live-indicator">
                <span className="live-dot" />
                Monitoring
              </span>
            </div>

            <div className="legend">
              <span><i className="legend-dot available-dot" /> Available</span>
              <span><i className="legend-dot occupied-dot" /> Occupied</span>
              <span><i className="legend-dot reserved-dot" /> Reserved</span>
            </div>

            {seats.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">▦</div>
                <h3>No seats found</h3>
                <p>
                  The API returned no seats. Check your backend and seat
                  records, then refresh.
                </p>
                <button className="primary-button" onClick={refreshSeats}>
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

                  let status = "Available";
                  let statusClass = "available";

                  if (occupied) {
                    status = "Occupied";
                    statusClass = "occupied";
                  } else if (reserved) {
                    status = mine ? "Reserved by you" : "Reserved";
                    statusClass = "reserved";
                  }

                  return (
                    <article
                      className={`seat-card seat-${statusClass}`}
                      key={seatId ?? index}
                    >
                      <div className="seat-card-top">
                        <span className="seat-number">
                          Seat {getSeatLabel(seat, index)}
                        </span>
                        <span className={`status-pill ${statusClass}`}>
                          {status}
                        </span>
                      </div>

                      <div className="seat-illustration" aria-hidden="true">
                        <div className="chair-back" />
                        <div className="chair-seat" />
                        <div className="chair-leg left-leg" />
                        <div className="chair-leg right-leg" />
                      </div>

                      <p className="seat-description">
                        {occupied
                          ? "Presence detected by sensor"
                          : reserved
                            ? "This seat has a reservation"
                            : "Ready for your next study session"}
                      </p>

                      {mine ? (
                        <button
                          className="secondary-button seat-action"
                          disabled={busySeat === seatId}
                          onClick={() => handleRelease(seat)}
                        >
                          {busySeat === seatId
                            ? "Processing..."
                            : "Release reservation"}
                        </button>
                      ) : (
                        <button
                          className="primary-button seat-action"
                          disabled={unavailable || busySeat === seatId}
                          onClick={() => handleReserve(seat)}
                        >
                          {busySeat === seatId
                            ? "Processing..."
                            : unavailable
                              ? "Unavailable"
                              : "Reserve seat"}
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
                ? `Last updated at ${lastUpdated.toLocaleTimeString()}`
                : "Waiting for the first update..."}
            </div>
          </section>

          <aside className="panel activity-panel">
            <div className="panel-heading">
              <div>
                <h2>Recent activity</h2>
                <p className="muted">Your latest notifications</p>
              </div>
              <span className="activity-count">{notifications.length}</span>
            </div>

            {notifications.length === 0 ? (
              <div className="activity-empty">
                <span className="activity-icon">◷</span>
                <p>No activity yet.</p>
                <span>Seat and reservation updates will appear here.</span>
              </div>
            ) : (
              <div className="activity-list">
                {notifications.map((item) => (
                  <article className="activity-item" key={item.id}>
                    <span className={`activity-marker ${item.type}`} />
                    <div className="activity-copy">
                      <strong>{item.title}</strong>
                      <p>{item.message}</p>
                      <time>{item.time}</time>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="sensor-note">
              <div className="sensor-icon">⌁</div>
              <div>
                <strong>ESP32 sensor monitoring</strong>
                <p>
                  Physical occupancy is refreshed from the backend. The
                  first successful fetch establishes the baseline; alerts
                  appear when occupancy changes on subsequent fetches.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <footer className="app-footer">
          <span>Smart Library</span>
          <span>Seat monitoring and reservations</span>
        </footer>
      </section>

      {toast && (
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      )}
    </main>
  );
}

function StatCard({ label, value, detail, tone = "" }) {
  return (
    <article className={`stat-card ${tone}`}>
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
