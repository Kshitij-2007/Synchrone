from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    author = Column(String, nullable=False)
    category = Column(String, nullable=False)
    isbn = Column(String, nullable=True)
    available = Column(Boolean, default=True)


class Borrow(Base):
    __tablename__ = "borrows"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    book_id = Column(Integer, ForeignKey("books.id"))
    returned = Column(Boolean, default=False)


class Seat(Base):
    __tablename__ = "seats"

    id = Column(Integer, primary_key=True, index=True)
    seat_number = Column(String, unique=True, nullable=False)

    # Physical occupancy detected by the sensor
    physically_occupied = Column(Boolean, default=False, nullable=False)

    # Reservation information
    is_reserved = Column(Boolean, default=False, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)