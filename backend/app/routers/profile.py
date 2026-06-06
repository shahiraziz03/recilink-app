from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User, Profile
from app.core.security import get_current_user_dep

router = APIRouter(prefix="/profile", tags=["Profile"])


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
