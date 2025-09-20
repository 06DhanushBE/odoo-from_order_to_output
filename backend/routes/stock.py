from datetime import datetime
from flask import Blueprint, request, jsonify
from models import db, Component, StockMovement
from utils import token_required

stock_bp = Blueprint('stock', __name__, url_prefix='/api/stock')

@stock_bp.route('', methods=['GET'])
@token_required
def get_stock(current_user):
    try:
        components = Component.query.all()
        return jsonify([component.to_dict() for component in components]), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@stock_bp.route('/movements', methods=['GET'])
@token_required
def get_stock_movements(current_user):
    try:
        movements = StockMovement.query.order_by(StockMovement.created_at.desc()).limit(100).all()
        return jsonify([movement.to_dict() for movement in movements]), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@stock_bp.route('/movements', methods=['POST'])
@token_required
def create_stock_movement(current_user):
    try:
        data = request.get_json()
        
        # Get the component
        component = Component.query.get_or_404(data['component_id'])
        
        movement = StockMovement(
            component_id=data['component_id'],
            movement_type=data['movement_type'],  # 'IN', 'OUT', 'ADJUSTMENT'
            quantity=data['quantity'],
            reference=data.get('reference', ''),
            created_at=datetime.utcnow()
        )
        
        # Update component quantity based on movement type
        if movement.movement_type == 'IN' or movement.movement_type == 'ADJUSTMENT':
            if movement.movement_type == 'ADJUSTMENT':
                # For adjustments, set quantity to the exact amount
                component.quantity_on_hand = movement.quantity
            else:
                # For IN movements, add to existing quantity
                component.quantity_on_hand += movement.quantity
        elif movement.movement_type == 'OUT':
            # For OUT movements, subtract from existing quantity
            if component.quantity_on_hand >= movement.quantity:
                component.quantity_on_hand -= movement.quantity
            else:
                return jsonify({'message': f'Insufficient stock. Available: {component.quantity_on_hand}, Requested: {movement.quantity}'}), 400
        
        db.session.add(movement)
        db.session.commit()
        
        return jsonify(movement.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

# Component routes
components_bp = Blueprint('components', __name__, url_prefix='/api/components')

@components_bp.route('', methods=['POST'])
@token_required
def create_component(current_user):
    try:
        data = request.get_json()
        
        component = Component(
            name=data['name'],
            quantity_on_hand=data.get('quantity_on_hand', 0),
            unit_cost=data.get('unit_cost', 0.0),
            supplier=data.get('supplier', ''),
            reorder_level=data.get('reorder_level', 10)
        )
        
        db.session.add(component)
        db.session.flush()  # Get component ID for stock movement
        
        # Create initial stock movement record if quantity > 0
        if component.quantity_on_hand > 0:
            stock_movement = StockMovement(
                component_id=component.id,
                movement_type='IN',
                quantity=component.quantity_on_hand,
                reference=f'Initial stock for {component.name}',
                created_at=datetime.utcnow()
            )
            db.session.add(stock_movement)
        
        db.session.commit()
        
        return jsonify(component.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@components_bp.route('/<int:component_id>', methods=['PUT'])
@token_required
def update_component(current_user, component_id):
    try:
        component = Component.query.get_or_404(component_id)
        data = request.get_json()
        
        old_quantity = component.quantity_on_hand
        old_price = component.unit_cost
        
        if 'name' in data:
            component.name = data['name']
        if 'unit_cost' in data:
            new_price = data['unit_cost']
            if new_price != old_price:
                # Create stock movement for price change tracking
                movement = StockMovement(
                    component_id=component.id,
                    movement_type='ADJUSTMENT',
                    quantity=component.quantity_on_hand,
                    reference=f'Price update: ${old_price:.2f} → ${new_price:.2f}',
                    created_at=datetime.utcnow()
                )
                db.session.add(movement)
            component.unit_cost = new_price
        if 'supplier' in data:
            component.supplier = data['supplier']
        if 'reorder_level' in data:
            component.reorder_level = data['reorder_level']
        if 'quantity_on_hand' in data:
            new_quantity = data['quantity_on_hand']
            if new_quantity != old_quantity:
                # Create stock movement for quantity change
                movement_type = 'IN' if new_quantity > old_quantity else 'OUT'
                quantity_change = abs(new_quantity - old_quantity)
                
                movement = StockMovement(
                    component_id=component.id,
                    movement_type=movement_type,
                    quantity=quantity_change,
                    reference=f'Manual adjustment: {old_quantity} → {new_quantity}',
                    created_at=datetime.utcnow()
                )
                db.session.add(movement)
                
            component.quantity_on_hand = new_quantity
        
        db.session.commit()
        
        return jsonify(component.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@components_bp.route('/<int:component_id>/update-price', methods=['PUT'])
@token_required
def update_component_price(current_user, component_id):
    try:
        component = Component.query.get_or_404(component_id)
        data = request.get_json()
        
        old_price = component.unit_cost
        new_price = data['unit_cost']
        
        component.unit_cost = new_price
        
        # Create a stock movement record for price update tracking
        movement = StockMovement(
            component_id=component.id,
            movement_type='ADJUSTMENT',
            quantity=component.quantity_on_hand,
            reference=f'Price update: ${old_price} → ${new_price}',
            created_at=datetime.utcnow()
        )
        db.session.add(movement)
        
        db.session.commit()
        
        return jsonify(component.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@components_bp.route('/<int:component_id>', methods=['DELETE'])
@token_required
def delete_component(current_user, component_id):
    try:
        component = Component.query.get_or_404(component_id)
        
        # Delete related stock movements first
        StockMovement.query.filter_by(component_id=component_id).delete()
        
        # Delete the component
        db.session.delete(component)
        db.session.commit()
        
        return jsonify({'message': 'Component deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400