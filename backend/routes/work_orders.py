from datetime import datetime
from flask import Blueprint, request, jsonify
from models import db, WorkOrder, WorkOrderStatus, OrderStatus
from utils import token_required

work_orders_bp = Blueprint('work_orders', __name__, url_prefix='/api/work-orders')

@work_orders_bp.route('/<order_id>', methods=['GET'])
@token_required
def get_work_orders(current_user, order_id):
    try:
        work_orders = WorkOrder.query.filter_by(manufacturing_order_id=order_id).all()
        return jsonify([wo.to_dict() for wo in work_orders]), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@work_orders_bp.route('/<int:work_order_id>', methods=['PUT'])
@token_required
def update_work_order(current_user, work_order_id):
    try:
        work_order = WorkOrder.query.get_or_404(work_order_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'message': 'No data provided'}), 400
        
        old_status = work_order.status.value if work_order.status else None
        manufacturing_order_updated = False
        
        if 'status' in data:
            try:
                new_status = WorkOrderStatus(data['status'])
                work_order.status = new_status
                
                # Update timestamps
                if new_status == WorkOrderStatus.STARTED and not work_order.started_at:
                    work_order.started_at = datetime.utcnow()
                elif new_status == WorkOrderStatus.COMPLETED and not work_order.completed_at:
                    work_order.completed_at = datetime.utcnow()
                
                # CASCADE STATUS TO MANUFACTURING ORDER
                manufacturing_order = work_order.manufacturing_order
                if manufacturing_order:
                    # Check if all work orders are completed
                    all_work_orders = manufacturing_order.work_orders
                    completed_count = sum(1 for wo in all_work_orders if wo.status == WorkOrderStatus.COMPLETED)
                    total_count = len(all_work_orders)
                    
                    # Update manufacturing order status based on work order progress
                    if completed_count == total_count and total_count > 0:
                        # All work orders complete -> Manufacturing order complete
                        if manufacturing_order.status != OrderStatus.DONE:
                            manufacturing_order.status = OrderStatus.DONE
                            manufacturing_order.completed_at = datetime.utcnow()
                            manufacturing_order_updated = True
                    
                        elif completed_count > 0 or any(wo.status == WorkOrderStatus.STARTED for wo in all_work_orders):
                            # Some work orders in progress -> Manufacturing order in progress
                            if manufacturing_order.status == OrderStatus.PLANNED:
                                manufacturing_order.status = OrderStatus.IN_PROGRESS
                                manufacturing_order_updated = True
                
            except ValueError as e:
                return jsonify({'message': f'Invalid status: {data.get("status")}. Valid values are: Pending, Started, Paused, Completed'}), 400
        
        # Commit the status change
        db.session.commit()
        
        response = work_order.to_dict()
        if manufacturing_order_updated:
            response['manufacturing_order_updated'] = {
                'id': manufacturing_order.id,
                'new_status': manufacturing_order.status.value,
                'completed_work_orders': completed_count,
                'total_work_orders': total_count
            }
            response['status_cascade'] = {
                'old_status': old_status,
                'new_status': work_order.status.value,
                'manufacturing_order_affected': True
            }
        
        return jsonify(response), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update work order: {str(e)}'}), 400

@work_orders_bp.route('/<int:wo_id>/start', methods=['POST'])
@token_required
def start_work_order(current_user, wo_id):
    try:
        work_order = WorkOrder.query.get_or_404(wo_id)
        
        if work_order.status != WorkOrderStatus.PENDING:
            return jsonify({'message': 'Work order cannot be started from current status'}), 400
        
        work_order.status = WorkOrderStatus.STARTED
        work_order.started_at = datetime.utcnow()
        work_order.assigned_user_id = current_user.id
        
        db.session.commit()
        return jsonify(work_order.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@work_orders_bp.route('/<int:wo_id>/complete', methods=['POST'])
@token_required
def complete_work_order(current_user, wo_id):
    try:
        work_order = WorkOrder.query.get_or_404(wo_id)
        data = request.get_json() or {}
        
        if work_order.status not in [WorkOrderStatus.STARTED, WorkOrderStatus.PAUSED]:
            return jsonify({'message': 'Work order must be started or paused to complete'}), 400
        
        old_status = work_order.status.value
        manufacturing_order_updated = False
        
        work_order.status = WorkOrderStatus.COMPLETED
        work_order.completed_at = datetime.utcnow()
        work_order.notes = data.get('notes', work_order.notes)
        work_order.issues = data.get('issues', work_order.issues)
        work_order.quality_check = data.get('quality_check', False)
        
        # Calculate actual duration and cost
        if work_order.started_at:
            duration = (work_order.completed_at - work_order.started_at).total_seconds() / 60
            work_order.actual_duration_minutes = int(duration)
            
            if work_order.work_center and work_order.work_center.cost_per_hour:
                work_order.actual_cost = (duration / 60) * work_order.work_center.cost_per_hour
        
        # CASCADE STATUS TO MANUFACTURING ORDER
        manufacturing_order = work_order.manufacturing_order
        if manufacturing_order:
            # Check if all work orders are now completed
            all_work_orders = manufacturing_order.work_orders
            completed_count = sum(1 for wo in all_work_orders if wo.status == WorkOrderStatus.COMPLETED)
            total_count = len(all_work_orders)
            
            if completed_count == total_count and total_count > 0:
                # All work orders complete -> Manufacturing order complete
                if manufacturing_order.status != OrderStatus.DONE:
                    manufacturing_order.status = OrderStatus.DONE
                    manufacturing_order.completed_at = datetime.utcnow()
                    manufacturing_order_updated = True
        
        db.session.commit()
        
        response = work_order.to_dict()
        if manufacturing_order_updated:
            response['manufacturing_order_updated'] = {
                'id': manufacturing_order.id,
                'product_name': manufacturing_order.product_name,
                'new_status': 'Done',
                'completed_at': manufacturing_order.completed_at.isoformat() + 'Z',
                'completed_work_orders': completed_count,
                'total_work_orders': total_count
            }
            response['status_cascade'] = {
                'work_order_completed': True,
                'manufacturing_order_completed': True,
                'message': f'Manufacturing order #{manufacturing_order.id} automatically completed'
            }
        
        return jsonify(response), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400