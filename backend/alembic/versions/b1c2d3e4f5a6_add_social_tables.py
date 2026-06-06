"""add social tables: saved_recipes, comments, follows

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f6
Create Date: 2026-06-05

"""
from typing import Union, Sequence
import sqlalchemy as sa
from alembic import op

revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'saved_recipes',
        sa.Column('id',        sa.Integer(), primary_key=True),
        sa.Column('user_id',   sa.Integer(), sa.ForeignKey('users.id',   ondelete='CASCADE'), nullable=False),
        sa.Column('recipe_id', sa.Integer(), sa.ForeignKey('recipes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'recipe_id', name='uq_saved_recipe'),
    )

    op.create_table(
        'comments',
        sa.Column('id',         sa.Integer(), primary_key=True),
        sa.Column('recipe_id',  sa.Integer(), sa.ForeignKey('recipes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id',    sa.Integer(), sa.ForeignKey('users.id',   ondelete='CASCADE'), nullable=False),
        sa.Column('content',    sa.Text(),    nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        'follows',
        sa.Column('id',           sa.Integer(), primary_key=True),
        sa.Column('follower_id',  sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('following_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at',   sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('follower_id', 'following_id', name='uq_follow'),
    )


def downgrade() -> None:
    op.drop_table('follows')
    op.drop_table('comments')
    op.drop_table('saved_recipes')
