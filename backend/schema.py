from pydantic import BaseModel
from typing import Optional


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class BookCreate(BaseModel):
    title: str
    author: str
    category: str
    isbn: Optional[str] = None


class BorrowRequest(BaseModel):
    user_id: int


class SeatReserveRequest(BaseModel):
    user_id: int