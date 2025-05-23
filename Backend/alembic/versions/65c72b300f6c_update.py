"""Update

Revision ID: 65c72b300f6c
Revises: 
Create Date: 2025-04-27 02:36:16.417772

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '65c72b300f6c'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('period_trackers', 'start_date',
               existing_type=sa.DATE(),
               type_=sa.String(),
               existing_nullable=False)
    op.alter_column('period_trackers', 'end_date',
               existing_type=sa.DATE(),
               type_=sa.String(),
               existing_nullable=True)
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('period_trackers', 'end_date',
               existing_type=sa.String(),
               type_=sa.DATE(),
               existing_nullable=True)
    op.alter_column('period_trackers', 'start_date',
               existing_type=sa.String(),
               type_=sa.DATE(),
               existing_nullable=False)
    # ### end Alembic commands ###
