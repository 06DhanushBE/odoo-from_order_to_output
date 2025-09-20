from flask import Blueprint, request, jsonify
from models import db, BillOfMaterial, BOMComponent, ManufacturingOrder
from utils import token_required

bom_bp = Blueprint('bom', __name__, url_prefix='/api/boms')

@bom_bp.route('', methods=['GET'])
@token_required
def get_boms(current_user):
    try:
        boms = BillOfMaterial.query.all()
        return jsonify([bom.to_dict() for bom in boms]), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@bom_bp.route('', methods=['POST'])
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

@bom_bp.route('/<int:bom_id>', methods=['DELETE'])
@token_required
def delete_bom(current_user, bom_id):
    try:
        bom = BillOfMaterial.query.get_or_404(bom_id)
        
        # Check if there are Manufacturing Orders referencing this BOM
        related_orders = ManufacturingOrder.query.filter_by(bom_id=bom_id).all()
        if related_orders:
            order_names = [f"MO-{order.id}" for order in related_orders]
            error_msg = f"Cannot delete BOM '{bom.name}' because it is referenced by Manufacturing Orders: {', '.join(order_names)}. Please delete or modify these orders first."
            return jsonify({'message': error_msg}), 400
        
        # Check if there are BOM Components referencing this BOM
        related_components = BOMComponent.query.filter_by(bom_id=bom_id).all()
        if related_components:
            print(f"🔗 Found {len(related_components)} BOM components to delete")
            # Delete BOM components first
            for component in related_components:
                db.session.delete(component)
        
        # Now safe to delete the BOM
        db.session.delete(bom)
        db.session.commit()
        
        return jsonify({'message': 'BOM deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400