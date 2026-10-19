# Smart Library — Synchrone

A smart library seat management system built with **React, FastAPI, SQLite, and ESP32**. The project combines a web interface for library users with backend APIs and hardware-based seat occupancy updates.

## 1. Project Overview

The Smart Library system is designed to manage library seating digitally.

### Core functionality

- **Seat management:** View library seats and their current status.
- **Seat reservation:** Allow users to reserve available seats.
- **Seat release:** Release a previously reserved seat.
- **Physical occupancy monitoring:** Receive seat occupancy updates from an ESP32 device.
- **Frontend notifications:** Intended to notify users about relevant seat-status changes.
- **REST API:** Connect the React frontend and hardware devices to the backend.

> Note: The exact features available depend on the current implementation. Check the API documentation and source files before assuming that every feature is fully implemented.

## 2. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, JavaScript, CSS |
| Frontend tooling | Vite, npm |
| Backend | Python, FastAPI |
| Database | SQLite |
| ORM | SQLAlchemy |
| Hardware | ESP32 |
| API testing | FastAPI Swagger UI |

## 3. Project Structure

```text
smart-seat/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schema.py
│   ├── requirements.txt
│   ├── library.db              # Local database, not committed
│   └── library_backup.db       # Local backup, not committed
│
├── src/
│   ├── App.jsx                 # Main React application
│   ├── App.css                 # Main application styling
│   ├── api.js                  # Frontend API communication
│   ├── main.jsx                # React entry point
│   ├── index.css               # Global styling
│   └── assets/                 # Images and other assets
│
├── public/                     # Static public assets
├── index.html                  # Frontend HTML entry point
├── package.json                # Frontend dependencies and scripts
├── package-lock.json
├── vite.config.js
├── eslint.config.js
├── .gitignore
└── README.md
```

## 4. Understanding the Backend

The backend is located in the `backend/` directory.

### `main.py` — Application entry point

- Creates and configures the FastAPI application.
- Defines API endpoints for the library system.
- Handles incoming HTTP requests.
- Connects application logic with database operations.
- Contains or integrates the seat management and hardware-related functionality.

### `database.py` — Database configuration

- Configures the SQLite database connection.
- Provides the SQLAlchemy database engine and session management.
- Defines or imports the shared SQLAlchemy base used by the models.

### `models.py` — Database models

- Defines the database tables using SQLAlchemy.
- Represents entities such as users, seats, and reservations, depending on the current schema.
- Defines relationships and stored attributes.

### `schema.py` — API data validation

- Defines request and response schemas.
- Validates data exchanged through API endpoints.
- Helps separate API input/output formats from database models.

### `requirements.txt` — Python dependencies

Lists the Python packages required by the backend.

## 5. Understanding the Frontend

The React frontend is located in `src/`.

### `App.jsx`

The main application interface. It brings together the library interface, seat status display, user interactions, and relevant UI state.

### `App.css`

Contains styling for the main application, including layout and visual elements.

### `api.js`

Centralizes communication between the React frontend and the FastAPI backend. Check this file for the API base URL and the functions used to send requests.

### `main.jsx`

The React entry point that mounts the application.

### `index.css`

Contains global styles shared across the frontend.

## 6. How the Components Work Together

```text
              USER
                |
                v
        React Frontend
         App.jsx / CSS
                |
                v
           src/api.js
                |
          HTTP Requests
                |
                v
         FastAPI Backend
            main.py
                |
          SQLAlchemy ORM
                |
                v
          SQLite Database


             ESP32
                |
         Hardware Requests
                |
                v
         FastAPI Backend
                |
       Physical Seat Status
                |
                v
        Frontend Seat Display
```

The frontend communicates with the backend through HTTP APIs. The backend processes requests and interacts with the database. The ESP32 can send hardware-related updates to the backend, which can then expose the resulting seat status to the frontend.

The precise update flow, endpoint names, and notification mechanism should be verified in `backend/main.py` and `src/api.js`.

## 7. Prerequisites

Install the following before running the project:

- Python 3.10 or a compatible version supported by the dependencies.
- Node.js and npm.
- Git.
- A code editor such as VS Code.

For hardware testing, an ESP32 and the required Arduino/ESP32 development environment may also be needed.

## 8. Installation and Setup

### Step 1: Clone the repository

```bash
git clone https://github.com/Kshitij-2007/Synchrone.git
cd Synchrone
```

### Step 2: Set up the backend

Open a terminal in the project root and run:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment on Windows using Git Bash:

```bash
source .venv/Scripts/activate
```

Alternatively, in Windows Command Prompt:

```bat
.venv\Scripts\activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI server from inside the `backend/` directory:

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The backend should now be available at:

- API base: `http://127.0.0.1:8000`
- Interactive API documentation: `http://127.0.0.1:8000/docs`
- Alternative API documentation: `http://127.0.0.1:8000/redoc`

Use `/docs` to inspect the actual endpoints available in the current implementation.

### Step 3: Set up the frontend

Open a second terminal at the project root:

```bash
npm install
npm run dev
```

Vite will display the local frontend URL in the terminal, commonly:

```text
http://localhost:5173
```

Open that URL in your browser.

### Step 4: Verify the connection

1. Ensure the backend is running.
2. Ensure the frontend is running.
3. Open the frontend URL.
4. Test the available login and seat-management features.
5. Open `/docs` to inspect and test the backend endpoints.

If the frontend cannot communicate with the backend, inspect the API base URL in `src/api.js` and the CORS configuration in `backend/main.py`.

## 9. Database Information

The project uses SQLite for local data storage.

- Database configuration is managed in `backend/database.py`.
- Database models are defined in `backend/models.py`.
- The local database file is `backend/library.db`.
- A local backup may exist as `backend/library_backup.db`.

**Important:** Database files are excluded from Git to avoid committing local data and backups. A fresh clone may not contain either file. Check the database initialization logic in `backend/main.py` and `backend/database.py` to determine whether the database and tables are created automatically or need an initialization step.

Do not commit a database containing real user information, passwords, or reservation records.

## 10. Hardware Integration — ESP32

The ESP32 is intended to communicate physical seat occupancy information to the backend.

When testing the hardware:

1. Start the FastAPI backend.
2. Ensure the ESP32 and the computer hosting the backend can communicate over the same network, where applicable.
3. Configure the ESP32 with the correct backend host IP address and port.
4. Verify the device identifier and endpoint configuration against the current firmware and backend code.
5. Send a hardware update and inspect the backend response.
6. Check whether the resulting seat status is reflected in the frontend.

**Networking note:** When the ESP32 communicates with a computer over Wi-Fi, `127.0.0.1` and `localhost` refer to the device making the request, not the computer hosting the backend. Use the computer's reachable local network IP address instead.

Inspect `backend/main.py` for hardware endpoints and the ESP32 firmware for the request format and device configuration.

## 11. Troubleshooting

| Problem | What to check |
|---|---|
| Frontend cannot connect to the backend | Confirm the backend is running and inspect `src/api.js`. |
| Browser reports a CORS error | Check the allowed origins in `backend/main.py`. |
| Port 8000 is already in use | Stop the other server process or configure a different port. |
| Login fails | Check the authentication endpoints and available user records. |
| Seat status does not update | Inspect the seat API, database operations, and hardware request logs. |
| ESP32 cannot reach the server | Check Wi-Fi connectivity, the computer's IP address, firewall rules, and endpoint URL. |
| Database or table is missing | Inspect the database initialization logic and migration/setup requirements. |
| Python dependency import fails | Activate the backend virtual environment and install `requirements.txt`. |
| Frontend dependency error | Run `npm install` from the project root. |

## 12. Development Guidelines

- Keep API communication centralized in `src/api.js`.
- Keep database table definitions in `backend/models.py`.
- Keep request and response validation in `backend/schema.py`.
- Keep database configuration and session management in `backend/database.py`.
- Avoid committing `.env` files, local databases, backups, Python caches, or `node_modules`.
- Test backend changes through `/docs` before integrating them with the frontend.
- Verify hardware updates independently before testing the complete system.

## 13. Repository

GitHub: https://github.com/Kshitij-2007/Synchrone

## 14. Project Status

This repository contains the Smart Library application source code. Refer to the current implementation, API documentation, and hardware firmware to determine which features are complete, partially implemented, or still under development.

---

**Quick start:** Start the FastAPI backend from `backend/`, start the Vite frontend from the project root, and open the frontend URL shown by Vite.
