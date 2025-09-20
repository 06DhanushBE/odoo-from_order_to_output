from datetime import datetime
from flask import Blueprint, request, jsonify
from models import (db, ManufacturingOrder, BillOfMaterial, OrderStatus, 
                   WorkOrder, WorkOrderStatus, StockMovement)
from utils import token_required

manufacturing_orders_bp = Blueprint('manufacturing_orders', __name__, url_prefix='/api/manufacturing-orders')

@manufacturing_orders_bp.route('', methods=['GET'])
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

@manufacturing_orders_bp.route('/<order_id>', methods=['GET'])
@token_required
def get_manufacturing_order(current_user, order_id):
    try:
        order = ManufacturingOrder.query.get_or_404(order_id)
        return jsonify(order.to_dict()), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@manufacturing_orders_bp.route('', methods=['POST'])
@token_required
def create_manufacturing_order(current_user):
    try:
        data = request.get_json()
        
        # Validate BOM exists
        bom = BillOfMaterial.query.get_or_404(data['bom_id'])
        
        # Check component availability
        required_quantity = data['quantity']
        stock_issues = []
        
        for bom_component in bom.components:
            required_for_order = bom_component.quantity_required * required_quantity
            available = bom_component.component.quantity_on_hand
            
            if available < required_for_order:
                stock_issues.append({
                    'component': bom_component.component.name,
                    'required': required_for_order,
                    'available': available,
                    'shortage': required_for_order - available
                })
        
        # If there are stock issues, return them as a warning (but still allow creation)
        if stock_issues:
            pass  # Stock shortages are handled in the response
        
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
            bom_id=data['bom_id'],
            priority=data.get('priority', 'Medium'),
            notes=data.get('notes', '')
        )
        
        db.session.add(order)
        db.session.flush()  # Get the order ID
        
        # Create work orders for the manufacturing order
        work_order = WorkOrder(
            name=f"Assembly - {order.product_name}",
            manufacturing_order_id=order.id,
            sequence=1,
            assigned_to=data.get('assigned_to', 'Unassigned'),
            duration_minutes=data.get('estimated_duration', 60)
        )
        db.session.add(work_order)
        
        db.session.commit()
        
        response_data = order.to_dict()
        if stock_issues:
            response_data['stock_warnings'] = stock_issues
        
        return jsonify(response_data), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@manufacturing_orders_bp.route('/<order_id>', methods=['PUT'])
@token_required
def update_manufacturing_order(current_user, order_id):
    try:
        order = ManufacturingOrder.query.get_or_404(order_id)
        data = request.get_json()
        
        old_status = order.status.value if order.status else None
        work_orders_updated = []
        
        if 'status' in data:
            try:
                new_status = OrderStatus(data['status'])
                order.status = new_status
                
                # CASCADE STATUS UPDATES TO WORK ORDERS
                if new_status == OrderStatus.IN_PROGRESS:
                    # Start all pending work orders
                    for work_order in order.work_orders:
                        if work_order.status == WorkOrderStatus.PENDING:
                            work_order.status = WorkOrderStatus.STARTED
                            work_order.started_at = datetime.utcnow()
                            work_orders_updated.append({
                                'id': work_order.id,
                                'name': work_order.name,
                                'new_status': 'Started'
                            })
                
                elif new_status == OrderStatus.DONE:
                    # Complete all work orders
                    for work_order in order.work_orders:
                        if work_order.status != WorkOrderStatus.COMPLETED:
                            work_order.status = WorkOrderStatus.COMPLETED
                            work_order.completed_at = datetime.utcnow()
                            if not work_order.started_at:
                                work_order.started_at = datetime.utcnow()
                            work_orders_updated.append({
                                'id': work_order.id,
                                'name': work_order.name,
                                'new_status': 'Completed'
                            })
                    order.completed_at = datetime.utcnow()
                
                elif new_status == OrderStatus.CANCELED:
                    # Cancel all work orders
                    for work_order in order.work_orders:
                        if work_order.status not in [WorkOrderStatus.COMPLETED]:
                            work_order.status = WorkOrderStatus.PENDING  # Reset to pending
                            work_orders_updated.append({
                                'id': work_order.id,
                                'name': work_order.name,
                                'new_status': 'Pending (Reset)'
                            })
                
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
        
        response = order.to_dict()
        if work_orders_updated:
            response['work_orders_updated'] = work_orders_updated
            response['status_cascade'] = {
                'old_status': old_status,
                'new_status': order.status.value,
                'affected_work_orders': len(work_orders_updated)
            }
        
        return jsonify(response), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@manufacturing_orders_bp.route('/<order_id>/complete', methods=['POST'])
@token_required
def complete_manufacturing_order(current_user, order_id):
    try:
        order = ManufacturingOrder.query.get_or_404(order_id)
        
        if order.status == OrderStatus.DONE:
            return jsonify({'message': 'Manufacturing order is already completed'}), 400
        
        # Get the BOM and components
        bom = order.bill_of_material
        stock_movements = []
        work_orders_updated = []
        
        # STEP 1: Validate stock availability first
        for bom_component in bom.components:
            required_quantity = bom_component.quantity_required * order.quantity
            component = bom_component.component
            
            if component.quantity_on_hand < required_quantity:
                return jsonify({
                    'message': f'Insufficient stock for {component.name}. Required: {required_quantity}, Available: {component.quantity_on_hand}',
                    'component_id': component.id,
                    'component_name': component.name,
                    'required': required_quantity,
                    'available': component.quantity_on_hand
                }), 400
        
        # STEP 2: Consume components from stock
        for bom_component in bom.components:
            required_quantity = bom_component.quantity_required * order.quantity
            component = bom_component.component
            
            # Create OUT movement for component consumption
            movement = StockMovement(
                component_id=component.id,
                movement_type='OUT',
                quantity=required_quantity,
                reference=f'Consumed for {order.id} - {order.product_name}',
                created_at=datetime.utcnow()
            )
            db.session.add(movement)
            stock_movements.append(movement)
            
            # Update component stock
            component.quantity_on_hand -= required_quantity
        
        # STEP 3: Update ALL related work orders to completed
        for work_order in order.work_orders:
            old_status = work_order.status.value
            work_order.status = WorkOrderStatus.COMPLETED
            work_order.completed_at = datetime.utcnow()
            if not work_order.started_at:
                work_order.started_at = datetime.utcnow()
            work_orders_updated.append({
                'id': work_order.id,
                'name': work_order.name,
                'old_status': old_status,
                'new_status': 'Completed',
                'completed_at': work_order.completed_at.isoformat()
            })
        
        # STEP 4: Update manufacturing order status and completion time
        old_order_status = order.status.value
        order.status = OrderStatus.DONE
        order.completed_at = datetime.utcnow()
        
        # STEP 5: Commit all changes atomically
        db.session.commit()
        
        # STEP 6: Prepare comprehensive response
        return jsonify({
            'success': True,
            'message': 'Manufacturing order completed successfully - All systems updated',
            'order': {
                'id': order.id,
                'product_name': order.product_name,
                'quantity': order.quantity,
                'old_status': old_order_status,
                'new_status': order.status.value,
                'completed_at': order.completed_at.isoformat(),
                'deadline': order.deadline.isoformat()
            },
            'work_orders_updated': work_orders_updated,
            'stock_movements': [{
                'component_name': movement.component.name,
                'quantity_consumed': movement.quantity,
                'remaining_stock': movement.component.quantity_on_hand,
                'movement_id': movement.id
            } for movement in stock_movements],
            'summary': {
                'total_work_orders_completed': len(work_orders_updated),
                'total_components_consumed': len(stock_movements),
                'completion_timestamp': datetime.utcnow().isoformat()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to complete manufacturing order: {str(e)}'
        }), 400

@manufacturing_orders_bp.route('/<order_id>', methods=['DELETE'])
@token_required
def delete_manufacturing_order(current_user, order_id):
    try:
        order = ManufacturingOrder.query.get_or_404(order_id)
        
        # Delete the manufacturing order (work orders will be deleted automatically due to cascade)
        db.session.delete(order)
        db.session.commit()
        
        return jsonify({'message': 'Manufacturing Order deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400