from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import enum
import random
import string

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

class WorkCenter(db.Model):
    __tablename__ = 'work_centers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    cost_per_hour = db.Column(db.Float, nullable=False, default=0.0)
    capacity = db.Column(db.Integer, default=1)  # Number of parallel operations
    efficiency = db.Column(db.Float, default=1.0)  # Efficiency factor (0.0 to 1.0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'cost_per_hour': self.cost_per_hour,
            'capacity': self.capacity,
            'efficiency': self.efficiency,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    phone = db.Column(db.String(20))
    department = db.Column(db.String(50))
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.OPERATOR)
    avatar = db.Column(db.String(200))  # Path to user avatar image
    is_active = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f"{self.first_name or ''} {self.last_name or ''}".strip(),
            'phone': self.phone,
            'department': self.department,
            'role': self.role.value,
            'avatar': self.avatar,
            'is_active': self.is_active,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat()
        }

class Component(db.Model):
    __tablename__ = 'components'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    quantity_on_hand = db.Column(db.Integer, nullable=False, default=0)
    unit_cost = db.Column(db.Float, default=0.0)
    supplier = db.Column(db.String(100))
    reorder_level = db.Column(db.Integer, default=10)  # Add missing reorder_level column
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'quantity_on_hand': self.quantity_on_hand,
            'unit_cost': self.unit_cost,
            'supplier': self.supplier,
            'reorder_level': self.reorder_level
        }

class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    sku = db.Column(db.String(50), unique=True)
    description = db.Column(db.Text)
    category = db.Column(db.String(50))
    unit_price = db.Column(db.Float, default=0.0)
    quantity_on_hand = db.Column(db.Integer, default=0)
    reorder_level = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'sku': self.sku,
            'description': self.description,
            'category': self.category,
            'unit_price': self.unit_price,
            'quantity_on_hand': self.quantity_on_hand,
            'reorder_level': self.reorder_level,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

class BillOfMaterial(db.Model):
    __tablename__ = 'bills_of_material'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    version = db.Column(db.String(20), default='1.0')
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to BOM components
    bom_components = db.relationship('BOMComponent', backref='bill_of_material', cascade='all, delete-orphan')
    
    @property
    def components(self):
        """Alias for bom_components to maintain compatibility"""
        return self.bom_components
    
    def to_dict(self):
        total_cost = sum(comp.component.unit_cost * comp.quantity_required 
                        for comp in self.bom_components 
                        if comp.component.unit_cost)
        
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'version': self.version,
            'active': self.active,
            'created_at': self.created_at.isoformat(),
            'total_cost': total_cost,
            'components': [comp.to_dict() for comp in self.bom_components] if self.bom_components else []
        }

class BOMComponent(db.Model):
    __tablename__ = 'bom_components'
    
    id = db.Column(db.Integer, primary_key=True)
    bom_id = db.Column(db.Integer, db.ForeignKey('bills_of_material.id'), nullable=False)
    component_id = db.Column(db.Integer, db.ForeignKey('components.id'), nullable=False)
    quantity_required = db.Column(db.Integer, nullable=False)
    notes = db.Column(db.Text)
    
    # Relationships
    component = db.relationship('Component', backref='bom_components')
    
    def to_dict(self):
        return {
            'id': self.id,
            'component_id': self.component_id,
            'component_name': self.component.name,
            'quantity_required': self.quantity_required,
            'unit_cost': self.component.unit_cost,
            'total_cost': self.component.unit_cost * self.quantity_required if self.component.unit_cost else 0,
            'notes': self.notes
        }

class ManufacturingOrder(db.Model):
    __tablename__ = 'manufacturing_orders'
    
    id = db.Column(db.String(20), primary_key=True)  # e.g., "MO-001"
    product_name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    deadline = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.Enum(OrderStatus), nullable=False, default=OrderStatus.PLANNED)
    bom_id = db.Column(db.Integer, db.ForeignKey('bills_of_material.id'), nullable=False)
    priority = db.Column(db.String(20), default='Medium')  # Low, Medium, High, Urgent
    notes = db.Column(db.Text)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    bill_of_material = db.relationship('BillOfMaterial', backref='manufacturing_orders')
    work_orders = db.relationship('WorkOrder', backref='manufacturing_order', cascade='all, delete-orphan')
    
    def to_dict(self):
        # Calculate progress based on work orders
        total_work_orders = len(self.work_orders)
        completed_work_orders = sum(1 for wo in self.work_orders if wo.status == WorkOrderStatus.COMPLETED)
        progress = (completed_work_orders / total_work_orders * 100) if total_work_orders > 0 else 0
        
        return {
            'id': self.id,
            'product_name': self.product_name,
            'quantity': self.quantity,
            'deadline': self.deadline.isoformat(),
            'status': self.status.value,
            'bom_id': self.bom_id,
            'bom_name': self.bill_of_material.name if self.bill_of_material else None,
            'priority': self.priority,
            'notes': self.notes,
            'progress': progress,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat(),
            'work_orders': [wo.to_dict() for wo in self.work_orders] if self.work_orders else []
        }

class WorkOrder(db.Model):
    __tablename__ = 'work_orders'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    duration_minutes = db.Column(db.Integer, nullable=False)
    status = db.Column(db.Enum(WorkOrderStatus), nullable=False, default=WorkOrderStatus.PENDING)
    manufacturing_order_id = db.Column(db.String(20), db.ForeignKey('manufacturing_orders.id'), nullable=False)
    work_center_id = db.Column(db.Integer, db.ForeignKey('work_centers.id'))
    assigned_user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    sequence = db.Column(db.Integer, default=1)  # Order of operations
    assigned_to = db.Column(db.String(100))  # Worker/operator name (legacy)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    paused_at = db.Column(db.DateTime)
    actual_duration_minutes = db.Column(db.Integer)
    estimated_cost = db.Column(db.Float, default=0.0)
    actual_cost = db.Column(db.Float, default=0.0)
    notes = db.Column(db.Text)
    issues = db.Column(db.Text)  # Track any issues or delays
    quality_check = db.Column(db.Boolean, default=False)
    
    # Relationships
    work_center = db.relationship('WorkCenter', backref='work_orders')
    assigned_user = db.relationship('User', backref='assigned_work_orders')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'duration_minutes': self.duration_minutes,
            'actual_duration_minutes': self.actual_duration_minutes,
            'status': self.status.value,
            'manufacturing_order_id': self.manufacturing_order_id,
            'work_center_id': self.work_center_id,
            'work_center_name': self.work_center.name if self.work_center else None,
            'assigned_user_id': self.assigned_user_id,
            'assigned_user_name': self.assigned_user.to_dict()['full_name'] if self.assigned_user else None,
            'sequence': self.sequence,
            'assigned_to': self.assigned_to,  # Legacy field
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'paused_at': self.paused_at.isoformat() if self.paused_at else None,
            'estimated_cost': self.estimated_cost,
            'actual_cost': self.actual_cost,
            'notes': self.notes,
            'issues': self.issues,
            'quality_check': self.quality_check
        }

class StockMovement(db.Model):
    """Track inventory movements"""
    __tablename__ = 'stock_movements'
    
    id = db.Column(db.Integer, primary_key=True)
    component_id = db.Column(db.Integer, db.ForeignKey('components.id'), nullable=False)
    movement_type = db.Column(db.String(20), nullable=False)  # 'in', 'out', 'adjustment'
    quantity = db.Column(db.Integer, nullable=False)
    reference = db.Column(db.String(50))  # MO ID, purchase order, etc.
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    component = db.relationship('Component', backref='stock_movements')
    
    def to_dict(self):
        return {
            'id': self.id,
            'component_id': self.component_id,
            'component_name': self.component.name,
            'movement_type': self.movement_type,
            'quantity': self.quantity,
            'reference': self.reference,
            'notes': self.notes,
            'created_at': self.created_at.isoformat()
        }

class PasswordReset(db.Model):
    """Track password reset requests and OTPs"""
    __tablename__ = 'password_resets'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False)
    otp = db.Column(db.String(6), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    @staticmethod
    def generate_otp():
        """Generate a 6-digit OTP"""
        return ''.join(random.choices(string.digits, k=6))
    
    @classmethod
    def create_reset_request(cls, email):
        """Create a new password reset request"""
        # Remove any existing unused requests for this email
        cls.query.filter_by(email=email, is_used=False).delete()
        
        otp = cls.generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=15)  # OTP expires in 15 minutes
        
        reset_request = cls(
            email=email,
            otp=otp,
            expires_at=expires_at
        )
        
        db.session.add(reset_request)
        db.session.commit()
        
        return reset_request
    
    def is_valid(self):
        """Check if OTP is still valid (not expired and not used)"""
        return not self.is_used and datetime.utcnow() < self.expires_at
    
    def mark_as_used(self):
        """Mark the OTP as used"""
        self.is_used = True
        db.session.commit()
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'expires_at': self.expires_at.isoformat(),
            'is_used': self.is_used,
            'created_at': self.created_at.isoformat()
        }