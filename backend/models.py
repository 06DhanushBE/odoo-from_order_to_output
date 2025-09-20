from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import enum

db = SQLAlchemy()

class UserRole(enum.Enum):
    MANAGER = "Manager"
    OPERATOR = "Operator"
    ADMIN = "Admin"

class OrderStatus(enum.Enum):
    PLANNED = "Planned"
    IN_PROGRESS = "In Progress"
    DONE = "Done"
    CANCELED = "Canceled"

class WorkOrderStatus(enum.Enum):
    PENDING = "Pending"
    STARTED = "Started"
    PAUSED = "Paused"
    COMPLETED = "Completed"

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.OPERATOR)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'role': self.role.value,
            'created_at': self.created_at.isoformat()
        }

class Component(db.Model):
    __tablename__ = 'components'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    quantity_on_hand = db.Column(db.Integer, nullable=False, default=0)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'quantity_on_hand': self.quantity_on_hand
        }

class BillOfMaterial(db.Model):
    __tablename__ = 'bills_of_material'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    
    # Relationship to BOM components
    bom_components = db.relationship('BOMComponent', backref='bill_of_material', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'components': [comp.to_dict() for comp in self.bom_components] if self.bom_components else []
        }

class BOMComponent(db.Model):
    __tablename__ = 'bom_components'
    
    id = db.Column(db.Integer, primary_key=True)
    bom_id = db.Column(db.Integer, db.ForeignKey('bills_of_material.id'), nullable=False)
    component_id = db.Column(db.Integer, db.ForeignKey('components.id'), nullable=False)
    quantity_required = db.Column(db.Integer, nullable=False)
    
    # Relationships
    component = db.relationship('Component', backref='bom_components')
    
    def to_dict(self):
        return {
            'id': self.id,
            'component_id': self.component_id,
            'component_name': self.component.name,
            'quantity_required': self.quantity_required
        }

class ManufacturingOrder(db.Model):
    __tablename__ = 'manufacturing_orders'
    
    id = db.Column(db.String(20), primary_key=True)  # e.g., "MO-001"
    product_name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    deadline = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.Enum(OrderStatus), nullable=False, default=OrderStatus.PLANNED)
    bom_id = db.Column(db.Integer, db.ForeignKey('bills_of_material.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    bill_of_material = db.relationship('BillOfMaterial', backref='manufacturing_orders')
    work_orders = db.relationship('WorkOrder', backref='manufacturing_order', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_name': self.product_name,
            'quantity': self.quantity,
            'deadline': self.deadline.isoformat(),
            'status': self.status.value,
            'bom_id': self.bom_id,
            'bom_name': self.bill_of_material.name if self.bill_of_material else None,
            'created_at': self.created_at.isoformat(),
            'work_orders': [wo.to_dict() for wo in self.work_orders] if self.work_orders else []
        }

class WorkOrder(db.Model):
    __tablename__ = 'work_orders'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=False)
    status = db.Column(db.Enum(WorkOrderStatus), nullable=False, default=WorkOrderStatus.PENDING)
    manufacturing_order_id = db.Column(db.String(20), db.ForeignKey('manufacturing_orders.id'), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'duration_minutes': self.duration_minutes,
            'status': self.status.value,
            'manufacturing_order_id': self.manufacturing_order_id
        }