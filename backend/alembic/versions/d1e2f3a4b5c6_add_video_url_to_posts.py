"""add video_url to posts

Revision ID: d1e2f3a4b5c6
Revises: c1d2e3f4a5b6
Create Date: 2026-11-18

"""
from typing import Union, Sequence
import sqlalchemy as sa
from alembic import op

revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4a5b6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("posts", sa.Column("video_url", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("posts", "video_url")
