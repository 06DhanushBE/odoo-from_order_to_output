from flask import Blueprint, request, jsonify
from models import db, WorkCenter

work_centers_bp = Blueprint('work_centers', __name__, url_prefix='/api/workcenters')

@work_centers_bp.route('', methods=['GET'])
def get_work_centers():
    try:
        work_centers = WorkCenter.query.filter_by(is_active=True).all()
        return jsonify([wc.to_dict() for wc in work_centers]), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@work_centers_bp.route('', methods=['POST'])
def create_work_center():
    try:
        data = request.get_json()
        
        work_center = WorkCenter(
            name=data['name'],
            description=data.get('description', ''),
            cost_per_hour=data.get('cost_per_hour', 0.0),
            capacity=data.get('capacity', 1),
            efficiency=data.get('efficiency', 1.0)
        )
        
        db.session.add(work_center)
        db.session.commit()
        
        return jsonify(work_center.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400