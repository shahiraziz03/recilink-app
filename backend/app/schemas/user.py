from pydantic import BaseModel, EmailStr

# --- Request Schemas (what the user sends to the API) ---

class UserRegister(BaseModel):
    """Schema for user registration request."""
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    """Schema for user login request."""
    identifier: str
    password: str

# --- Response Schemas (what the API sends back) ---

class UserResponse(BaseModel):
    """Schema for user data returned after register/login."""
    id: int
    username: str
    email: str

    model_config = {"from_attributes": True}

class TokenResponse(BaseModel):
    """Schema for JWT token returned after successful login."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
