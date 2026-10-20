"""add last_checkin_date to profiles

Revision ID: a1b2c3d4e5f6
Revises: 9cb41158c2b4
Create Date: 2026-06-05

"""
from typing import Union, Sequence
import sqlalchemy as sa
from alembic import op

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '3ab6b604a75f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('profiles', sa.Column('last_checkin_date', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('profiles', 'last_checkin_date')
