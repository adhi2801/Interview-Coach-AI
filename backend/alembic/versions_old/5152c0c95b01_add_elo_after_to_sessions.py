"""add elo_after to sessions

Revision ID: 5152c0c95b01
Revises: 72aa8e07558b
Create Date: 2026-07-03 14:52:32.121013

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5152c0c95b01'
down_revision: Union[str, Sequence[str], None] = '72aa8e07558b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sessions', sa.Column('elo_after', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('sessions', 'elo_after')