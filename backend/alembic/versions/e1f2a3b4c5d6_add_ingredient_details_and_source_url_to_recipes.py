"""add ingredient_details and source_url to recipes

Revision ID: e1f2a3b4c5d6
Revises: d1e2f3a4b5c6
Create Date: 2026-11-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("recipes", sa.Column("ingredient_details", sa.JSON(), nullable=True))
    op.add_column("recipes", sa.Column("source_url", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("recipes", "source_url")
    op.drop_column("recipes", "ingredient_details")
