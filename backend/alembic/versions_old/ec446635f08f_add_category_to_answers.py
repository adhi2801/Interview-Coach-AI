"""add category to answers

Revision ID: ec446635f08f
Revises: 5367330e47ee
Create Date: 2026-07-02 21:55:07.555511

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec446635f08f'
down_revision: Union[str, Sequence[str], None] = '5367330e47ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
