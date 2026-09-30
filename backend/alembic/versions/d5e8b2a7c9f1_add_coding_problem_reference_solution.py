"""add coding_problems.reference_solution

The verified Python solution each problem pack was checked against, shown
to a user only after they have submitted their own.

Revision ID: d5e8b2a7c9f1
Revises: c4f2a9d81b37
Create Date: 2026-10-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5e8b2a7c9f1'
down_revision: Union[str, Sequence[str], None] = 'c4f2a9d81b37'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nullable: filled by the seed script on the next start (it backfills
    # problems that already exist); older problems without one stay NULL.
    op.add_column('coding_problems', sa.Column('reference_solution', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('coding_problems', 'reference_solution')
