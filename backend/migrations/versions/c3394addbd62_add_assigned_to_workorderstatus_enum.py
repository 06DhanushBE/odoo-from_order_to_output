"""Add ASSIGNED to WorkOrderStatus enum

Revision ID: c3394addbd62
Revises: d7f23b4c8e91
Create Date: 2025-09-21 07:38:40.030963

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3394addbd62'
down_revision = 'd7f23b4c8e91'
branch_labels = None
depends_on = None


def upgrade():
    # Add 'ASSIGNED' to the WorkOrderStatus enum
    # PostgreSQL requires us to use ALTER TYPE to add new enum values
    op.execute("ALTER TYPE workorderstatus ADD VALUE 'ASSIGNED' AFTER 'PENDING'")


def downgrade():
    # Note: PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum and updating all references
    # For now, we'll leave this empty as enum value removal is complex
    pass
