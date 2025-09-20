import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import jwt
from datetime import datetime, timedelta
from functools import wraps
from models import db, User, ManufacturingOrder, BillOfMaterial, Component, BOMComponent, WorkOrder, OrderStatus, UserRole
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SESSION_SECRET', 'dev-secret-key')

# Initialize database
db.init_app(app)

# JWT token decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'message': 'Token is missing!'}), 401
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['user_id']).first()
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# Authentication endpoints
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'message': 'Email already exists'}), 400
        
        role_str = data.get('role', 'Operator')
        try:
            role = UserRole(role_str)
        except ValueError:
            role = UserRole.OPERATOR
            
        user = User(
            email=data['email'],
            role=role
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({'message': 'User created successfully'}), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user = User.query.filter_by(email=data['email']).first()
        
        if user and user.check_password(data['password']):
            token = jwt.encode({
                'user_id': user.id,
                'exp': datetime.utcnow() + timedelta(hours=24)
            }, app.config['SECRET_KEY'], algorithm="HS256")
            
            return jsonify({
                'token': token,
                'user': user.to_dict()
            }), 200
        
        return jsonify({'message': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'message': str(e)}), 400

# Manufacturing Order endpoints
@app.route('/api/manufacturing-orders', methods=['GET'])
@token_required
def get_manufacturing_orders(current_user):
    try:
        status_filter = request.args.get('status')
        
        query = ManufacturingOrder.query
        if status_filter:
            try:
                status_enum = OrderStatus(status_filter)
                query = query.filter(ManufacturingOrder.status == status_enum)
            except ValueError:
                return jsonify({'message': 'Invalid status filter'}), 400
        
        orders = query.all()
        return jsonify([order.to_dict() for order in orders]), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/manufacturing-orders/<order_id>', methods=['GET'])
@token_required
def get_manufacturing_order(current_user, order_id):
    try:
        order = ManufacturingOrder.query.get_or_404(order_id)
        return jsonify(order.to_dict()), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/manufacturing-orders', methods=['POST'])
@token_required
def create_manufacturing_order(current_user):
    try:
        data = request.get_json()
        
        # Generate MO ID
        last_order = ManufacturingOrder.query.order_by(ManufacturingOrder.id.desc()).first()
        if last_order:
            last_num = int(last_order.id.split('-')[1])
            mo_id = f"MO-{str(last_num + 1).zfill(3)}"
        else:
            mo_id = "MO-001"
        
        order = ManufacturingOrder(
            id=mo_id,
            product_name=data['product_name'],
            quantity=data['quantity'],
            deadline=datetime.fromisoformat(data['deadline'].replace('Z', '+00:00')),
            bom_id=data['bom_id']
        )
        
        db.session.add(order)
        db.session.commit()
        
        return jsonify(order.to_dict()), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/manufacturing-orders/<order_id>', methods=['PUT'])
@token_required
def update_manufacturing_order(current_user, order_id):
    try:
        order = ManufacturingOrder.query.get_or_404(order_id)
        data = request.get_json()
        
        if 'status' in data:
            try:
                order.status = OrderStatus(data['status'])
            except ValueError:
                return jsonify({'message': 'Invalid status'}), 400
        
        if 'product_name' in data:
            order.product_name = data['product_name']
        if 'quantity' in data:
            order.quantity = data['quantity']
        if 'deadline' in data:
            order.deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
        if 'bom_id' in data:
            order.bom_id = data['bom_id']
        
        db.session.commit()
        
        return jsonify(order.to_dict()), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

# BOM endpoints
@app.route('/api/boms', methods=['GET'])
@token_required
def get_boms(current_user):
    try:
        boms = BillOfMaterial.query.all()
        return jsonify([bom.to_dict() for bom in boms]), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/boms', methods=['POST'])
@token_required
def create_bom(current_user):
    try:
        data = request.get_json()
        
        bom = BillOfMaterial(
            name=data['name'],
            description=data.get('description', '')
        )
        
        db.session.add(bom)
        db.session.flush()  # Get the BOM ID
        
        # Add components
        for component_data in data.get('components', []):
            bom_component = BOMComponent(
                bom_id=bom.id,
                component_id=component_data['component_id'],
                quantity_required=component_data['quantity_required']
            )
            db.session.add(bom_component)
        
        db.session.commit()
        
        return jsonify(bom.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

# Stock/Component endpoints
@app.route('/api/stock', methods=['GET'])
@token_required
def get_stock(current_user):
    try:
        components = Component.query.all()
        return jsonify([component.to_dict() for component in components]), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

# Dashboard summary endpoint
@app.route('/api/dashboard/summary', methods=['GET'])
@token_required
def get_dashboard_summary(current_user):
    try:
        summary = {}
        for status in OrderStatus:
            count = ManufacturingOrder.query.filter(ManufacturingOrder.status == status).count()
            summary[status.value] = count
        
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

# Initialize database tables
def create_tables():
    db.create_all()
    
    # Create sample data if tables are empty
    if User.query.count() == 0:
        # Create admin user
        admin = User(email='admin@example.com', role=UserRole.ADMIN)
        admin.set_password('admin123')
        db.session.add(admin)
        
        # Create sample components
        components = [
            Component(name='Wooden Leg', quantity_on_hand=100),
            Component(name='Screw', quantity_on_hand=500),
            Component(name='Table Top', quantity_on_hand=50),
            Component(name='Wood Glue', quantity_on_hand=20)
        ]
        
        for component in components:
            db.session.add(component)
        
        db.session.flush()  # Get component IDs
        
        # Create sample BOM
        bom = BillOfMaterial(
            name='Wooden Table Recipe',
            description='Recipe for manufacturing a wooden table'
        )
        db.session.add(bom)
        db.session.flush()
        
        # Add BOM components
        bom_components = [
            BOMComponent(bom_id=bom.id, component_id=1, quantity_required=4),  # 4 wooden legs
            BOMComponent(bom_id=bom.id, component_id=2, quantity_required=16), # 16 screws
            BOMComponent(bom_id=bom.id, component_id=3, quantity_required=1),  # 1 table top
            BOMComponent(bom_id=bom.id, component_id=4, quantity_required=1)   # 1 wood glue
        ]
        
        for bom_comp in bom_components:
            db.session.add(bom_comp)
        
        # Create sample manufacturing order
        mo = ManufacturingOrder(
            id='MO-001',
            product_name='Wooden Table',
            quantity=10,
            deadline=datetime.now() + timedelta(days=30),
            bom_id=bom.id
        )
        db.session.add(mo)
        
        # Create sample work orders
        work_orders = [
            WorkOrder(name='Cutting', duration_minutes=120, manufacturing_order_id='MO-001'),
            WorkOrder(name='Assembly', duration_minutes=180, manufacturing_order_id='MO-001'),
            WorkOrder(name='Finishing', duration_minutes=90, manufacturing_order_id='MO-001')
        ]
        
        for wo in work_orders:
            db.session.add(wo)
        
        db.session.commit()

if __name__ == '__main__':
    with app.app_context():
        create_tables()
    app.run(debug=True, host='0.0.0.0', port=5001)