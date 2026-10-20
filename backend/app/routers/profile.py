from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.user import User, Profile
from app.models.social import Follow
from app.core.security import get_current_user_dep

router = APIRouter(prefix="/profile", tags=["Profile"])


class ProfileUpdate(BaseModel):
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    dietary_preferences: Optional[List[str]] = None
    frequently_used_ingredients: Optional[List[str]] = None


@router.get("/me")
async def get_my_profile(
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    followers_count = (await db.execute(
        select(func.count(Follow.id)).where(Follow.following_id == current_user.id)
    )).scalar_one()

    following_count = (await db.execute(
        select(func.count(Follow.id)).where(Follow.follower_id == current_user.id)
    )).scalar_one()

    return {
        "id": profile.id,
        "user_id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "bio": profile.bio,
        "avatar_url": profile.avatar_url,
        "dietary_preferences": profile.dietary_preferences or [],
        "frequently_used_ingredients": profile.frequently_used_ingredients or [],
        "cooking_streak": profile.cooking_streak or 0,
        "last_checkin_date": profile.last_checkin_date.isoformat() if profile.last_checkin_date else None,
        "followers_count": followers_count,
        "following_count": following_count,
    }


@router.put("/me")
async def update_my_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)

    if payload.bio is not None:
        profile.bio = payload.bio
    if payload.avatar_url is not None:
        profile.avatar_url = payload.avatar_url
    if payload.dietary_preferences is not None:
        profile.dietary_preferences = payload.dietary_preferences
    if payload.frequently_used_ingredients is not None:
        profile.frequently_used_ingredients = payload.frequently_used_ingredients

    await db.commit()
    await db.refresh(profile)

    followers_count = (await db.execute(
        select(func.count(Follow.id)).where(Follow.following_id == current_user.id)
    )).scalar_one()

    following_count = (await db.execute(
        select(func.count(Follow.id)).where(Follow.follower_id == current_user.id)
    )).scalar_one()

    return {
        "id": profile.id,
        "user_id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "bio": profile.bio,
        "avatar_url": profile.avatar_url,
        "dietary_preferences": profile.dietary_preferences or [],
        "frequently_used_ingredients": profile.frequently_used_ingredients or [],
        "cooking_streak": profile.cooking_streak or 0,
        "last_checkin_date": profile.last_checkin_date.isoformat() if profile.last_checkin_date else None,
        "followers_count": followers_count,
        "following_count": following_count,
    }



@router.get("/streak")
async def get_streak(
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    today = date.today()
    checked_in_today = profile.last_checkin_date == today

    return {
        "cooking_streak": profile.cooking_streak,
        "last_checkin_date": profile.last_checkin_date.isoformat() if profile.last_checkin_date else None,
        "checked_in_today": checked_in_today,
    }


@router.post("/checkin")
async def daily_checkin(
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    today = date.today()

    if profile.last_checkin_date == today:
        return {
            "cooking_streak": profile.cooking_streak,
            "last_checkin_date": today.isoformat(),
            "checked_in_today": True,
            "message": "Already checked in today",
        }

    if profile.last_checkin_date == today - timedelta(days=1):
        profile.cooking_streak = (profile.cooking_streak or 0) + 1
    else:
        profile.cooking_streak = 1

    profile.last_checkin_date = today
    await db.commit()
    await db.refresh(profile)

    return {
        "cooking_streak": profile.cooking_streak,
        "last_checkin_date": today.isoformat(),
        "checked_in_today": True,
        "message": "Check-in successful",
    }
