"""modified tool_configs

Revision ID: 05a15a46c1a4
Revises: cac478732572
Create Date: 2023-07-26 11:56:23.276124

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '05a15a46c1a4'
down_revision = 'cac478732572'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('tool_configs', sa.Column('key_type', sa.String(), nullable=True))
    op.add_column('tool_configs', sa.Column('is_required', sa.Boolean(), nullable=True))
    op.add_column('tool_configs', sa.Column('is_secret', sa.Boolean(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('tool_configs', 'is_secret')
    op.drop_column('tool_configs', 'is_required')
    op.drop_column('tool_configs', 'key_type')
    # ### end Alembic commands ###