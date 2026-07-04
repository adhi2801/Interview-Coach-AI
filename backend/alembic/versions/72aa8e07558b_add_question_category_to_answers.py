"""add question_category to answers

Revision ID: 72aa8e07558b
Revises: ec446635f08f
Create Date: 2026-07-03 14:04:26.267639

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '72aa8e07558b'
down_revision: Union[str, Sequence[str], None] = 'ec446635f08f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('answers', sa.Column('question_category', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('answers', 'question_category')