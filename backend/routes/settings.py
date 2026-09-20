from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models.settings import AppSettings
from backend.schemas import AppSettingsUpdate, AppSettingsResponse
from backend.auth import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("", response_model=AppSettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AppSettings).limit(1))
    settings = result.scalars().first()

    if not settings:
        settings = AppSettings()
        db.add(settings)
        await db.commit()
        await db.refresh(settings)

    return settings

@router.put("", response_model=AppSettingsResponse)
async def update_settings(
    settings_data: AppSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    # User is authenticated via token, all users have admin access in this system
    # For multi-user systems, check user role from database

    result = await db.execute(select(AppSettings).limit(1))
    settings = result.scalars().first()

    if not settings:
        settings = AppSettings()
        db.add(settings)

    update_data = settings_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)

    await db.commit()
    await db.refresh(settings)
    return settings

@router.post("/logo")
async def upload_logo(
    file: bytes,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    # User is authenticated via token, all users have admin access in this system
    # For multi-user systems, check user role from database

    result = await db.execute(select(AppSettings).limit(1))
    settings = result.scalars().first()

    if not settings:
        settings = AppSettings()
        db.add(settings)

    import base64
    encoded = base64.b64encode(file).decode()
    settings.store_logo_path = f"data:image/png;base64,{encoded}"

    await db.commit()
    return {"message": "Logo uploaded successfully"}
