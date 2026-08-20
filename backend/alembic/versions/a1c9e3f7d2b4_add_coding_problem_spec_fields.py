"""add coding problem spec fields (input/output format, constraints, complexity targets)

Revision ID: a1c9e3f7d2b4
Revises: f02ffa4a5c3a
Create Date: 2026-08-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1c9e3f7d2b4'
down_revision: Union[str, Sequence[str], None] = 'f02ffa4a5c3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # All nullable — existing CodingProblem rows get NULL until backfilled
    # or regenerated. The frontend already renders an honest "unavailable"
    # state for NULL rather than fabricating a value, so this is safe to
    # ship without a backfill step.
    op.add_column('coding_problems', sa.Column('input_format', sa.Text(), nullable=True))
    op.add_column('coding_problems', sa.Column('output_format', sa.Text(), nullable=True))
    op.add_column('coding_problems', sa.Column('constraints', sa.JSON(), nullable=True))
    op.add_column('coding_problems', sa.Column('time_complexity_target', sa.String(), nullable=True))
    op.add_column('coding_problems', sa.Column('space_complexity_target', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('coding_problems', 'space_complexity_target')
    op.drop_column('coding_problems', 'time_complexity_target')
    op.drop_column('coding_problems', 'constraints')
    op.drop_column('coding_problems', 'output_format')
    op.drop_column('coding_problems', 'input_format')