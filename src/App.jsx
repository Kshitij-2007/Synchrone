import { useEffect, useState } from "react";

import {
    login,
    getBooks,
    borrowBook,
    returnBook,
    getUserBooks,
    getSeats,
    reserveSeat,
    releaseSeat
} from "./api";

import "./App.css";


function App() {

    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const [user, setUser] = useState(null);

    const [email, setEmail] = useState("student@library.com");
    const [password, setPassword] = useState("1234");

    const [loginError, setLoginError] = useState("");


    // =====================================================
    // DASHBOARD
    // =====================================================

    const [activePage, setActivePage] = useState("dashboard");


    // =====================================================
    // BOOKS
    // =====================================================

    const [books, setBooks] = useState([]);
    const [search, setSearch] = useState("");


    // =====================================================
    // BORROWED BOOKS
    // =====================================================

    const [myBooks, setMyBooks] = useState([]);


    // =====================================================
    // SEATS
    // =====================================================

    const [seats, setSeats] = useState([]);


    // =====================================================
    // GENERAL
    // =====================================================

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");


    // =====================================================
    // LOAD DATA AFTER LOGIN
    // =====================================================

    useEffect(() => {

        if (!user) {
            return;
        }

        loadAllData();

    }, [user]);


    async function loadAllData() {

        try {

            setLoading(true);
            setError("");

            const [
                booksData,
                seatsData,
                borrowedData
            ] = await Promise.all([
                getBooks(),
                getSeats(),
                getUserBooks(user.id)
            ]);

            setBooks(booksData);
            setSeats(seatsData);
            setMyBooks(borrowedData);

        } catch (err) {

            setError(err.message);

        } finally {

            setLoading(false);

        }
    }


    // =====================================================
    // LOGIN
    // =====================================================

    async function handleLogin(event) {

        event.preventDefault();

        try {

            setLoginError("");

            const loggedInUser = await login(
                email,
                password
            );

            setUser(loggedInUser);

        } catch (err) {

            setLoginError(err.message);

        }
    }


    // =====================================================
    // LOGOUT
    // =====================================================

    function handleLogout() {

        setUser(null);
        setActivePage("dashboard");
        setBooks([]);
        setSeats([]);
        setMyBooks([]);
        setMessage("");
        setError("");

    }


    // =====================================================
    // SEARCH BOOKS
    // =====================================================

    async function handleSearch(value) {

        setSearch(value);

        try {

            const data = await getBooks(value);

            setBooks(data);

        } catch (err) {

            setError(err.message);

        }
    }


    // =====================================================
    // BORROW
    // =====================================================

    async function handleBorrow(bookId) {

        try {

            setError("");
            setMessage("");

            await borrowBook(
                bookId,
                user.id
            );

            setMessage("Book borrowed successfully!");

            await loadAllData();

        } catch (err) {

            setError(err.message);

        }
    }


    // =====================================================
    // RETURN
    // =====================================================

    async function handleReturn(bookId) {

        try {

            setError("");
            setMessage("");

            await returnBook(
                bookId,
                user.id
            );

            setMessage("Book returned successfully!");

            await loadAllData();

        } catch (err) {

            setError(err.message);

        }
    }


    // =====================================================
    // RESERVE SEAT
    // =====================================================

    async function handleReserveSeat(seatId) {

        try {

            setError("");
            setMessage("");

            await reserveSeat(
                seatId,
                user.id
            );

            setMessage("Seat reserved successfully!");

            await loadAllData();

        } catch (err) {

            setError(err.message);

        }
    }


    // =====================================================
    // RELEASE SEAT
    // =====================================================

    async function handleReleaseSeat(seatId) {

        try {

            setError("");
            setMessage("");

            await releaseSeat(
                seatId,
                user.id
            );

            setMessage("Seat released successfully!");

            await loadAllData();

        } catch (err) {

            setError(err.message);

        }
    }


    // =====================================================
    // LOGIN SCREEN
    // =====================================================

    if (!user) {

        return (

            <div className="login-page">

                <div className="login-card">

                    <div className="logo-large">
                        📚
                    </div>

                    <h1>Smart Library</h1>

                    <p className="login-subtitle">
                        Your intelligent library management system
                    </p>


                    <form onSubmit={handleLogin}>

                        <label>
                            Email
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                            placeholder="Enter your email"
                        />


                        <label>
                            Password
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            placeholder="Enter your password"
                        />


                        {loginError && (

                            <div className="error-message">
                                {loginError}
                            </div>

                        )}


                        <button
                            className="primary-button login-button"
                            type="submit"
                        >
                            Login
                        </button>

                    </form>


                    <div className="demo-login">

                        <strong>Demo account</strong>

                        <span>
                            student@library.com
                        </span>

                        <span>
                            Password: 1234
                        </span>

                    </div>

                </div>

            </div>

        );
    }


    // =====================================================
    // STATISTICS
    // =====================================================

    const totalBooks = books.length;

    const availableBooks = books.filter(
        book => book.available
    ).length;

    const freeSeats = seats.filter(
        seat => !seat.occupied
    ).length;


    // =====================================================
    // DASHBOARD
    // =====================================================

    function Dashboard() {

        return (

            <div>

                <div className="welcome">

                    <div>

                        <h1>
                            Good evening, {user.name.split(" ")[0]} 👋
                        </h1>

                        <p>
                            Here's what's happening in your library.
                        </p>

                    </div>

                </div>


                <div className="stats-grid">

                    <div className="stat-card">

                        <div className="stat-icon">
                            📚
                        </div>

                        <div>

                            <span>
                                Total Books
                            </span>

                            <strong>
                                {totalBooks}
                            </strong>

                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            ✅
                        </div>

                        <div>

                            <span>
                                Available Books
                            </span>

                            <strong>
                                {availableBooks}
                            </strong>

                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            💺
                        </div>

                        <div>

                            <span>
                                Free Seats
                            </span>

                            <strong>
                                {freeSeats}
                            </strong>

                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            📖
                        </div>

                        <div>

                            <span>
                                My Books
                            </span>

                            <strong>
                                {myBooks.length}
                            </strong>

                        </div>

                    </div>

                </div>


                <div className="quick-grid">

                    <button
                        className="quick-card"
                        onClick={() => setActivePage("books")}
                    >

                        <span>📚</span>

                        <div>

                            <strong>
                                Browse Books
                            </strong>

                            <p>
                                Search and borrow books
                            </p>

                        </div>

                    </button>


                    <button
                        className="quick-card"
                        onClick={() => setActivePage("seats")}
                    >

                        <span>💺</span>

                        <div>

                            <strong>
                                Find a Seat
                            </strong>

                            <p>
                                Reserve your library seat
                            </p>

                        </div>

                    </button>


                    <button
                        className="quick-card"
                        onClick={() => setActivePage("borrowed")}
                    >

                        <span>📖</span>

                        <div>

                            <strong>
                                My Borrowed Books
                            </strong>

                            <p>
                                View books you currently have
                            </p>

                        </div>

                    </button>

                </div>


                <div className="section-card">

                    <div className="section-header">

                        <div>

                            <h2>
                                Recently Available
                            </h2>

                            <p>
                                Books currently available to borrow
                            </p>

                        </div>

                        <button
                            className="text-button"
                            onClick={() => setActivePage("books")}
                        >
                            View all →
                        </button>

                    </div>


                    <div className="book-list">

                        {books
                            .filter(book => book.available)
                            .slice(0, 4)
                            .map(book => (

                                <BookRow
                                    key={book.id}
                                    book={book}
                                    onBorrow={handleBorrow}
                                />

                            ))}

                    </div>

                </div>

            </div>

        );
    }


    // =====================================================
    // BOOKS PAGE
    // =====================================================

    function BooksPage() {

        return (

            <div>

                <div className="page-header">

                    <div>

                        <h1>
                            Library Books
                        </h1>

                        <p>
                            Search, explore and borrow books.
                        </p>

                    </div>

                </div>


                <div className="search-box">

                    <span>
                        🔍
                    </span>

                    <input
                        value={search}
                        onChange={(e) =>
                            handleSearch(e.target.value)
                        }
                        placeholder="Search by title, author or category..."
                    />

                </div>


                <div className="book-grid">

                    {books.map(book => (

                        <div
                            className="book-card"
                            key={book.id}
                        >

                            <div className="book-cover">
                                📖
                            </div>


                            <div className="book-info">

                                <span className="category">
                                    {book.category}
                                </span>

                                <h3>
                                    {book.title}
                                </h3>

                                <p>
                                    {book.author}
                                </p>

                                <small>
                                    ISBN: {book.isbn || "N/A"}
                                </small>


                                <div className="book-footer">

                                    <span
                                        className={
                                            book.available
                                                ? "available"
                                                : "unavailable"
                                        }
                                    >

                                        {book.available
                                            ? "Available"
                                            : "Borrowed"}

                                    </span>


                                    {book.available && (

                                        <button
                                            className="small-button"
                                            onClick={() =>
                                                handleBorrow(book.id)
                                            }
                                        >
                                            Borrow
                                        </button>

                                    )}

                                </div>

                            </div>

                        </div>

                    ))}

                </div>

            </div>

        );
    }


    // =====================================================
    // SEATS PAGE
    // =====================================================

    function SeatsPage() {

        return (

            <div>

                <div className="page-header">

                    <div>

                        <h1>
                            Library Seats
                        </h1>

                        <p>
                            Choose a free seat and start studying.
                        </p>

                    </div>

                </div>


                <div className="seat-legend">

                    <div>
                        <span className="legend free"></span>
                        Free
                    </div>

                    <div>
                        <span className="legend occupied"></span>
                        Occupied
                    </div>

                    <div>
                        <span className="legend mine"></span>
                        My Seat
                    </div>

                </div>


                <div className="seat-room">

                    <div className="room-title">
                        📚 STUDY AREA
                    </div>


                    <div className="seat-grid">

                        {seats.map(seat => {

                            const isMine =
                                seat.user_id === user.id;

                            return (

                                <button
                                    key={seat.id}
                                    className={`seat ${
                                        !seat.occupied
                                            ? "seat-free"
                                            : isMine
                                                ? "seat-mine"
                                                : "seat-occupied"
                                    }`}
                                    onClick={() => {

                                        if (!seat.occupied) {

                                            handleReserveSeat(
                                                seat.id
                                            );

                                        } else if (isMine) {

                                            handleReleaseSeat(
                                                seat.id
                                            );

                                        }

                                    }}
                                >

                                    <span>
                                        💺
                                    </span>

                                    <strong>
                                        {seat.seat_number}
                                    </strong>


                                    <small>

                                        {!seat.occupied
                                            ? "Free"
                                            : isMine
                                                ? "Your seat"
                                                : "Occupied"}

                                    </small>

                                </button>

                            );

                        })}

                    </div>

                </div>

            </div>

        );
    }


    // =====================================================
    // BORROWED PAGE
    // =====================================================

    function BorrowedPage() {

        return (

            <div>

                <div className="page-header">

                    <div>

                        <h1>
                            My Books
                        </h1>

                        <p>
                            Books currently borrowed by you.
                        </p>

                    </div>

                </div>


                {myBooks.length === 0 ? (

                    <div className="empty-state">

                        <div>
                            📚
                        </div>

                        <h2>
                            No borrowed books
                        </h2>

                        <p>
                            You haven't borrowed any books yet.
                        </p>

                        <button
                            className="primary-button"
                            onClick={() =>
                                setActivePage("books")
                            }
                        >
                            Browse Books
                        </button>

                    </div>

                ) : (

                    <div className="borrowed-list">

                        {myBooks.map(book => (

                            <div
                                className="borrowed-card"
                                key={book.borrow_id}
                            >

                                <div className="borrowed-icon">
                                    📖
                                </div>

                                <div className="borrowed-info">

                                    <h3>
                                        {book.title}
                                    </h3>

                                    <p>
                                        {book.author}
                                    </p>

                                    <span>
                                        {book.category}
                                    </span>

                                </div>

                                <button
                                    className="return-button"
                                    onClick={() =>
                                        handleReturn(book.book_id)
                                    }
                                >
                                    Return Book
                                </button>

                            </div>

                        ))}

                    </div>

                )}

            </div>

        );
    }


    // =====================================================
    // BOOK ROW
    // =====================================================

    function BookRow({ book, onBorrow }) {

        return (

            <div className="book-row">

                <div className="row-book-icon">
                    📖
                </div>

                <div className="row-book-info">

                    <strong>
                        {book.title}
                    </strong>

                    <span>
                        {book.author}
                    </span>

                </div>

                <span className="category">
                    {book.category}
                </span>

                <button
                    className="small-button"
                    onClick={() =>
                        onBorrow(book.id)
                    }
                >
                    Borrow
                </button>

            </div>

        );
    }


    // =====================================================
    // MAIN APPLICATION
    // =====================================================

    return (

        <div className="app">

            {/* SIDEBAR */}

            <aside className="sidebar">

                <div className="brand">

                    <div className="brand-icon">
                        📚
                    </div>

                    <div>

                        <strong>
                            Smart Library
                        </strong>

                        <span>
                            Management System
                        </span>

                    </div>

                </div>


                <nav>

                    <button
                        className={
                            activePage === "dashboard"
                                ? "nav-item active"
                                : "nav-item"
                        }
                        onClick={() =>
                            setActivePage("dashboard")
                        }
                    >
                        <span>🏠</span>
                        Dashboard
                    </button>


                    <button
                        className={
                            activePage === "books"
                                ? "nav-item active"
                                : "nav-item"
                        }
                        onClick={() =>
                            setActivePage("books")
                        }
                    >
                        <span>📚</span>
                        Books
                    </button>


                    <button
                        className={
                            activePage === "seats"
                                ? "nav-item active"
                                : "nav-item"
                        }
                        onClick={() =>
                            setActivePage("seats")
                        }
                    >
                        <span>💺</span>
                        Seats
                    </button>


                    <button
                        className={
                            activePage === "borrowed"
                                ? "nav-item active"
                                : "nav-item"
                        }
                        onClick={() =>
                            setActivePage("borrowed")
                        }
                    >
                        <span>📖</span>
                        My Books
                    </button>

                </nav>


                <div className="sidebar-bottom">

                    <div className="user-profile">

                        <div className="avatar">
                            {user.name.charAt(0).toUpperCase()}
                        </div>

                        <div>

                            <strong>
                                {user.name}
                            </strong>

                            <span>
                                Student
                            </span>

                        </div>

                    </div>


                    <button
                        className="logout-button"
                        onClick={handleLogout}
                    >
                        ↪ Logout
                    </button>

                </div>

            </aside>


            {/* MAIN CONTENT */}

            <main className="main-content">

                <header className="topbar">

                    <div className="mobile-title">
                        📚 Smart Library
                    </div>

                    <div className="topbar-right">

                        <span>
                            {new Date().toLocaleDateString(
                                "en-IN",
                                {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long"
                                }
                            )}
                        </span>

                        <div className="top-avatar">
                            {user.name.charAt(0).toUpperCase()}
                        </div>

                    </div>

                </header>


                <div className="content">

                    {message && (

                        <div className="success-message">
                            ✅ {message}
                        </div>

                    )}


                    {error && (

                        <div className="error-message global-error">
                            ⚠️ {error}
                        </div>

                    )}


                    {loading ? (

                        <div className="loading">
                            Loading...
                        </div>

                    ) : (

                        <>

                            {activePage === "dashboard" && (
                                <Dashboard />
                            )}

                            {activePage === "books" && (
                                <BooksPage />
                            )}

                            {activePage === "seats" && (
                                <SeatsPage />
                            )}

                            {activePage === "borrowed" && (
                                <BorrowedPage />
                            )}

                        </>

                    )}

                </div>

            </main>

        </div>

    );
}


export default App;