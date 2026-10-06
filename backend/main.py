from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, get_db
from models import User, Book, Borrow, Seat
from schema import (
    UserCreate,
    UserLogin,
    BookCreate,
    BorrowRequest,
    SeatReserveRequest
)


# =========================================================
# DATABASE
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="Smart Library API",
    description="Full-stack Smart Library Management System",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():
    return {
        "message": "Smart Library API is running"
    }


# =========================================================
# SEED DATABASE
# =========================================================

@app.post("/seed")
def seed_database(db: Session = Depends(get_db)):

    # -----------------------------------------------------
    # Create demo user
    # -----------------------------------------------------

    user = db.query(User).filter(
        User.email == "student@library.com"
    ).first()

    if not user:

        user = User(
            name="Demo Student",
            email="student@library.com",
            password="1234"
        )

        db.add(user)
        db.commit()
        db.refresh(user)


    # -----------------------------------------------------
    # Create books
    # -----------------------------------------------------

    if db.query(Book).count() == 0:

        books = [

            Book(
                title="Clean Code",
                author="Robert C. Martin",
                category="Programming",
                isbn="9780132350884"
            ),

            Book(
                title="The Pragmatic Programmer",
                author="Andrew Hunt",
                category="Programming",
                isbn="9780135957059"
            ),

            Book(
                title="Introduction to Algorithms",
                author="Thomas H. Cormen",
                category="Algorithms",
                isbn="9780262046305"
            ),

            Book(
                title="Python Crash Course",
                author="Eric Matthes",
                category="Python",
                isbn="9781718502703"
            ),

            Book(
                title="Artificial Intelligence",
                author="Stuart Russell",
                category="Artificial Intelligence",
                isbn="9780134610993"
            ),

            Book(
                title="Database System Concepts",
                author="Abraham Silberschatz",
                category="Database",
                isbn="9780078022159"
            )

        ]

        db.add_all(books)


    # -----------------------------------------------------
    # Create 40 library seats
    # -----------------------------------------------------

    if db.query(Seat).count() == 0:

        seats = []

        for row in ["A", "B", "C", "D", "E"]:

            for number in range(1, 9):

                seat = Seat(
                    seat_number=f"{row}{number}",
                    occupied=False,
                    user_id=None
                )

                seats.append(seat)

        db.add_all(seats)


    db.commit()

    return {
        "message": "Database seeded successfully",
        "books": db.query(Book).count(),
        "seats": db.query(Seat).count()
    }


# =========================================================
# REGISTER
# =========================================================

@app.post("/register")
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):

    existing_user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )


    user = User(
        name=user_data.name,
        email=user_data.email,
        password=user_data.password
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email
    }


# =========================================================
# LOGIN
# =========================================================

@app.post("/login")
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.email == login_data.email
    ).first()


    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    if user.password != login_data.password:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    return {
        "id": user.id,
        "name": user.name,
        "email": user.email
    }


# =========================================================
# GET ALL BOOKS
# =========================================================

@app.get("/books")
def get_books(
    search: str = "",
    db: Session = Depends(get_db)
):

    query = db.query(Book)


    if search:

        search_pattern = f"%{search}%"

        query = query.filter(
            (Book.title.ilike(search_pattern)) |
            (Book.author.ilike(search_pattern)) |
            (Book.category.ilike(search_pattern))
        )


    books = query.all()


    return [
        {
            "id": book.id,
            "title": book.title,
            "author": book.author,
            "category": book.category,
            "isbn": book.isbn,
            "available": book.available
        }

        for book in books
    ]


# =========================================================
# ADD BOOK
# =========================================================

@app.post("/books")
def add_book(
    book_data: BookCreate,
    db: Session = Depends(get_db)
):

    book = Book(
        title=book_data.title,
        author=book_data.author,
        category=book_data.category,
        isbn=book_data.isbn,
        available=True
    )

    db.add(book)
    db.commit()
    db.refresh(book)


    return {
        "message": "Book added successfully",

        "book": {
            "id": book.id,
            "title": book.title,
            "author": book.author,
            "category": book.category,
            "isbn": book.isbn,
            "available": book.available
        }
    }


# =========================================================
# BORROW BOOK
# =========================================================

@app.post("/books/{book_id}/borrow")
def borrow_book(
    book_id: int,
    request: BorrowRequest,
    db: Session = Depends(get_db)
):

    # -----------------------------------------------------
    # Find book
    # -----------------------------------------------------

    book = db.query(Book).filter(
        Book.id == book_id
    ).first()


    if not book:

        raise HTTPException(
            status_code=404,
            detail="Book not found"
        )


    # -----------------------------------------------------
    # Check availability
    # -----------------------------------------------------

    if not book.available:

        raise HTTPException(
            status_code=400,
            detail="Book is already borrowed"
        )


    # -----------------------------------------------------
    # Find user
    # -----------------------------------------------------

    user = db.query(User).filter(
        User.id == request.user_id
    ).first()


    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    # -----------------------------------------------------
    # Create borrowing record
    # -----------------------------------------------------

    borrow = Borrow(
        user_id=user.id,
        book_id=book.id,
        returned=False
    )


    # Book is no longer available

    book.available = False


    db.add(borrow)
    db.commit()


    return {
        "message": "Book borrowed successfully"
    }


# =========================================================
# RETURN BOOK
# =========================================================

@app.post("/books/{book_id}/return")
def return_book(
    book_id: int,
    request: BorrowRequest,
    db: Session = Depends(get_db)
):

    borrow = db.query(Borrow).filter(
        Borrow.book_id == book_id,
        Borrow.user_id == request.user_id,
        Borrow.returned == False
    ).first()


    if not borrow:

        raise HTTPException(
            status_code=404,
            detail="Active borrowing record not found"
        )


    book = db.query(Book).filter(
        Book.id == book_id
    ).first()


    # Mark borrowing as returned

    borrow.returned = True


    # Make book available again

    if book:

        book.available = True


    db.commit()


    return {
        "message": "Book returned successfully"
    }


# =========================================================
# GET USER'S BORROWED BOOKS
# =========================================================

@app.get("/users/{user_id}/books")
def get_user_books(
    user_id: int,
    db: Session = Depends(get_db)
):

    records = db.query(Borrow).filter(
        Borrow.user_id == user_id,
        Borrow.returned == False
    ).all()


    result = []


    for record in records:

        book = db.query(Book).filter(
            Book.id == record.book_id
        ).first()


        if book:

            result.append({

                "borrow_id": record.id,

                "book_id": book.id,

                "title": book.title,

                "author": book.author,

                "category": book.category

            })


    return result


# =========================================================
# GET ALL SEATS
# =========================================================

@app.get("/seats")
def get_seats(
    db: Session = Depends(get_db)
):

    seats = db.query(Seat).order_by(
        Seat.id
    ).all()


    return [

        {
            "id": seat.id,

            "seat_number": seat.seat_number,

            "occupied": seat.occupied,

            "user_id": seat.user_id
        }

        for seat in seats

    ]


# =========================================================
# RESERVE SEAT
# =========================================================

@app.post("/seats/{seat_id}/reserve")
def reserve_seat(
    seat_id: int,
    request: SeatReserveRequest,
    db: Session = Depends(get_db)
):

    seat = db.query(Seat).filter(
        Seat.id == seat_id
    ).first()


    if not seat:

        raise HTTPException(
            status_code=404,
            detail="Seat not found"
        )


    if seat.occupied:

        raise HTTPException(
            status_code=400,
            detail="Seat is already occupied"
        )


    user = db.query(User).filter(
        User.id == request.user_id
    ).first()


    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    seat.occupied = True

    seat.user_id = request.user_id


    db.commit()


    return {
        "message": "Seat reserved successfully"
    }


# =========================================================
# RELEASE SEAT
# =========================================================

@app.post("/seats/{seat_id}/release")
def release_seat(
    seat_id: int,
    request: SeatReserveRequest,
    db: Session = Depends(get_db)
):

    seat = db.query(Seat).filter(
        Seat.id == seat_id
    ).first()


    if not seat:

        raise HTTPException(
            status_code=404,
            detail="Seat not found"
        )


    if not seat.occupied:

        raise HTTPException(
            status_code=400,
            detail="Seat is already free"
        )


    # Only the user who reserved it can release it

    if seat.user_id != request.user_id:

        raise HTTPException(
            status_code=403,
            detail="You cannot release this seat"
        )


    seat.occupied = False

    seat.user_id = None


    db.commit()


    return {
        "message": "Seat released successfully"
    }