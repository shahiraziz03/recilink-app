from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User, Profile
from app.schemas.user import UserRegister, UserLogin, TokenResponse, UserResponse
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    """
    Register a new user account.
    - Checks if email or username already exists
    - Hashes the password securely before saving
    - Automatically creates a blank profile for the new user
    """
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if username already exists
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create new user with hashed password
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password)
    )
    db.add(new_user)
    await db.flush()  # Get the new user's ID before committing

    # Auto-create a blank profile for the new user
    new_profile = Profile(user_id=new_user.id)
    db.add(new_profile)

    await db.commit()
    await db.refresh(new_user)

    return new_user


@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Login with username or email, and password.
    - Returns a JWT access token on success
    - Token can be used to access protected endpoints
    """
    # Find user by username or email
    result = await db.execute(select(User).where(User.email == user_data.identifier))
    user = result.scalar_one_or_none()

    if not user:
        result = await db.execute(select(User).where(User.username == user_data.identifier))
        user = result.scalar_one_or_none()

    # Verify user exists and password is correct
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")

    # Create JWT token
    access_token = create_access_token(data={"sub": str(user.id), "username": user.username})

    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )
