import os
from datetime import datetime, timedelta
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from models import (db, User, ManufacturingOrder, BillOfMaterial, Component, 
                   BOMComponent, WorkOrder, OrderStatus, UserRole, PasswordReset, 
                   WorkCenter, StockMovement, WorkOrderStatus)
from dotenv import load_dotenv

# Import route blueprints
from routes.auth import auth_bp
from routes.manufacturing_orders import manufacturing_orders_bp
from routes.bom import bom_bp
from routes.stock import stock_bp, components_bp
from routes.work_orders import work_orders_bp
from routes.dashboard import dashboard_bp
from routes.profile import profile_bp
from routes.work_centers import work_centers_bp

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='/static')
    CORS(app)
    
    # Database configuration - fallback to SQLite for development
    database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/manufacturing_system_db')
    
    # Try PostgreSQL first, fallback to SQLite if connection fails
    try:
        import psycopg2
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
        # Test connection
        from sqlalchemy import create_engine
        engine = create_engine(database_url)
        engine.connect()
        print("✅ Connected to PostgreSQL database")
    except Exception as e:
        print(f"⚠️  PostgreSQL connection failed: {e}")
        print("📁 Falling back to SQLite database")
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///instance/manufacturing.db'
    
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    # Initialize database and migrations
    db.init_app(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(manufacturing_orders_bp)
    app.register_blueprint(bom_bp)
    app.register_blueprint(stock_bp)
    app.register_blueprint(components_bp)
    app.register_blueprint(work_orders_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(work_centers_bp)
    
    return app

app = create_app()
migrate = Migrate(app, db)

# Initialize database tables
def create_tables():
    with app.app_context():
        db.create_all()

def create_sample_data():
    """Create sample data if tables are empty"""
    with app.app_context():
        if WorkCenter.query.count() == 0:
            # Get existing users
            admin = User.query.filter_by(email='admin@example.com').first()
            operator = User.query.filter_by(email='operator@example.com').first()
            
            if not admin:
                admin = User(
                    email='admin@example.com', 
                    role=UserRole.ADMIN,
                    first_name='Admin',
                    last_name='User',
                    department='Management'
                )
                admin.set_password('admin123')
                db.session.add(admin)
            
            if not operator:
                operator = User(
                    email='operator@example.com', 
                    role=UserRole.OPERATOR,
                    first_name='John',
                    last_name='Doe',
                    department='Production',
                    phone='555-0123'
                )
                operator.set_password('operator123')
                db.session.add(operator)
            
            # Create work centers
            work_centers = [
                WorkCenter(name='Assembly Line 1', cost_per_hour=25.0, capacity=2, description='Primary assembly station'),
                WorkCenter(name='Cutting Station', cost_per_hour=30.0, capacity=1, description='Wood cutting and preparation'),
                WorkCenter(name='Finishing Station', cost_per_hour=20.0, capacity=1, description='Sanding and finishing'),
                WorkCenter(name='Quality Control', cost_per_hour=35.0, capacity=1, description='Quality inspection station')
            ]
            
            for wc in work_centers:
                db.session.add(wc)
            
            db.session.flush()  # Get IDs for work centers
            
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
            
            # Create sample work orders with work center assignments
            work_orders = [
                WorkOrder(
                    name='Cutting', 
                    duration_minutes=120, 
                    manufacturing_order_id='MO-001',
                    work_center_id=work_centers[1].id,  # Cutting Station
                    assigned_user_id=operator.id
                ),
                WorkOrder(
                    name='Assembly', 
                    duration_minutes=180, 
                    manufacturing_order_id='MO-001',
                    work_center_id=work_centers[0].id,  # Assembly Line 1
                    assigned_user_id=operator.id
                ),
                WorkOrder(
                    name='Finishing', 
                    duration_minutes=90, 
                    manufacturing_order_id='MO-001',
                    work_center_id=work_centers[2].id,  # Finishing Station
                    assigned_user_id=operator.id
                ),
                WorkOrder(
                    name='Quality Check', 
                    duration_minutes=30, 
                    manufacturing_order_id='MO-001',
                    work_center_id=work_centers[3].id,  # Quality Control
                    assigned_user_id=admin.id
                )
            ]
            
            for wo in work_orders:
                db.session.add(wo)
            
            db.session.commit()
            print("Sample data created successfully!")

if __name__ == '__main__':
    with app.app_context():
        create_tables()
        create_sample_data()
    app.run(debug=True, host='0.0.0.0', port=8000)