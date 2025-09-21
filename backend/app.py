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

# Sample data creation removed - use separate data seeding script if needed

if __name__ == '__main__':
    with app.app_context():
        create_tables()
    app.run(debug=True, host='0.0.0.0', port=8000)