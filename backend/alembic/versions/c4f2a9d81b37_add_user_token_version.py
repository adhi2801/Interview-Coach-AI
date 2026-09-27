"""add users.token_version for revoking login tokens

Every access token carries the user's token_version; bumping it (sign out
everywhere, password change) invalidates every token issued before.

Revision ID: c4f2a9d81b37
Revises: 79235a304a9c
Create Date: 2026-09-27 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4f2a9d81b37'
down_revision: Union[str, Sequence[str], None] = '79235a304a9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default so existing rows get 0 — which is also what tokens
    # issued before this migration are treated as, so no one is logged out.
    op.add_column('users', sa.Column('token_version', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('users', 'token_version')
