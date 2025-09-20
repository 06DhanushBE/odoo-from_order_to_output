from flask import Blueprint, jsonify
from models import db, OrderStatus, ManufacturingOrder, Component, BillOfMaterial
from utils import token_required

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/summary', methods=['GET'])
@token_required
def get_dashboard_summary(current_user):
    try:
        summary = {}
        
        # Get total orders count
        try:
            total_orders = ManufacturingOrder.query.count()
            summary['total_orders'] = total_orders
        except Exception as db_error:
            return jsonify({'message': f'Database error: {str(db_error)}'}), 500
        
        # Count orders by status
        for status in OrderStatus:
            try:
                count = ManufacturingOrder.query.filter(ManufacturingOrder.status == status).count()
                summary[status.value] = count
            except Exception:
                summary[status.value] = 0
        
        # Additional dashboard metrics
        try:
            summary['total_components'] = Component.query.count()
        except Exception:
            summary['total_components'] = 0
            
        try:
            summary['total_boms'] = BillOfMaterial.query.count()
        except Exception:
            summary['total_boms'] = 0
        
        # Get low stock components count
        try:
            low_stock_count = Component.query.filter(Component.quantity_on_hand < 10).count()
            summary['low_stock_components'] = low_stock_count
        except Exception:
            summary['low_stock_components'] = 0
        
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400