const API_URL = "http://127.0.0.1:8000";


// =========================================================
// LOGIN
// =========================================================

export async function login(email, password) {

    const response = await fetch(`${API_URL}/login`, {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            email: email,
            password: password
        })
    });


    const data = await response.json();


    if (!response.ok) {
        throw new Error(data.detail || "Login failed");
    }


    return data;
}


// =========================================================
// REGISTER
// =========================================================

export async function register(name, email, password) {

    const response = await fetch(`${API_URL}/register`, {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            name: name,
            email: email,
            password: password
        })
    });


    const data = await response.json();


    if (!response.ok) {
        throw new Error(data.detail || "Registration failed");
    }


    return data;
}


// =========================================================
// GET BOOKS
// =========================================================

export async function getBooks(search = "") {

    const response = await fetch(
        `${API_URL}/books?search=${encodeURIComponent(search)}`
    );


    const data = await response.json();


    if (!response.ok) {
        throw new Error(data.detail || "Could not load books");
    }


    return data;
}


// =========================================================
// BORROW BOOK
// =========================================================

export async function borrowBook(bookId, userId) {

    const response = await fetch(
        `${API_URL}/books/${bookId}/borrow`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                user_id: userId
            })
        }
    );


    const data = await response.json();


    if (!response.ok) {
        throw new Error(data.detail || "Could not borrow book");
    }


    return data;
}


// =========================================================
// RETURN BOOK
// =========================================================

export async function returnBook(bookId, userId) {

    const response = await fetch(
        `${API_URL}/books/${bookId}/return`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                user_id: userId
            })
        }
    );


    const data = await response.json();


    if (!response.ok) {
        throw new Error(data.detail || "Could not return book");
    }


    return data;
}


// =========================================================
// GET USER'S BORROWED BOOKS
// =========================================================

export async function getUserBooks(userId) {

    const response = await fetch(
        `${API_URL}/users/${userId}/books`
    );


    const data = await response.json();


    if (!response.ok) {
        throw new Error(data.detail || "Could not load borrowed books");
    }


    return data;
}


// =========================================================
// GET SEATS
// =========================================================

export async function getSeats() {

    const response = await fetch(
        `${API_URL}/seats`
    );


    const data = await response.json();


    if (!response.ok) {
        throw new Error(data.detail || "Could not load seats");
    }


    return data;
}


// =========================================================
// RESERVE SEAT
// =========================================================

export async function reserveSeat(seatId, userId) {

    const response = await fetch(
        `${API_URL}/seats/${seatId}/reserve`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                user_id: userId
            })
        }
    );


    const data = await response.json();


    if (!response.ok) {
        throw new Error(data.detail || "Could not reserve seat");
    }


    return data;
}


// =========================================================
// RELEASE SEAT
// =========================================================

export async function releaseSeat(seatId, userId) {

    const response = await fetch(
        `${API_URL}/seats/${seatId}/release`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                user_id: userId
            })
        }
    );


    const data = await response.json();


    if (!response.ok) {
        throw new Error(data.detail || "Could not release seat");
    }


    return data;
}