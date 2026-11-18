from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import cloudinary
import cloudinary.uploader
from app.core.config import settings
from app.core.security import get_current_user_dep
from app.models.user import User

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)

router = APIRouter(prefix="/uploads", tags=["Uploads"])

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_dep),
):
    content_type = file.content_type or ""
    if content_type.startswith("image/"):
        resource_type = "image"
        limit_bytes = MAX_IMAGE_SIZE
        limit_mb = 10
    elif content_type.startswith("video/"):
        resource_type = "video"
        limit_bytes = MAX_VIDEO_SIZE
        limit_mb = 50
    else:
        raise HTTPException(
            status_code=400,
            detail="Only image or video files are allowed",
        )

    data = await file.read()
    if len(data) > limit_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large (max {limit_mb}MB)",
        )

    try:
        result = cloudinary.uploader.upload(
            data,
            resource_type=resource_type,
            folder="recilink",
        )
    except Exception as e:
        print("CLOUDINARY ERROR:", repr(e))
        raise HTTPException(status_code=502, detail="Upload to Cloudinary failed")

    return {
        "url": result.get("secure_url"),
        "media_type": resource_type,
        "duration": result.get("duration"),
    }
