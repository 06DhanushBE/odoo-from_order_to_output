from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash
from models import db
from utils import token_required
import os
import base64
import uuid

profile_bp = Blueprint('profile', __name__, url_prefix='/api/profile')

@profile_bp.route('', methods=['GET'])
@token_required
def get_profile(current_user):
    """Get user profile information"""
    try:
        return jsonify(current_user.to_dict()), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@profile_bp.route('', methods=['PUT'])
@token_required
def update_profile(current_user):
    """Update user profile information"""
    try:
        data = request.get_json()
        
        # Handle password change separately with current password verification
        if 'new_password' in data and data['new_password']:
            current_password = data.get('current_password')
            
            if not current_password:
                return jsonify({'message': 'Current password is required to change password'}), 400
            
            # Verify current password
            if not check_password_hash(current_user.password_hash, current_password):
                return jsonify({'message': 'Current password is incorrect'}), 400
            
            # Validate new password
            new_password = data['new_password']
            if len(new_password) < 6:
                return jsonify({'message': 'New password must be at least 6 characters long'}), 400
            
            current_user.set_password(new_password)
        
        # Update profile fields
        if 'first_name' in data:
            current_user.first_name = data['first_name']
        if 'last_name' in data:
            current_user.last_name = data['last_name']
        if 'phone' in data:
            current_user.phone = data['phone']
        if 'department' in data:
            current_user.department = data['department']
        
        # Handle avatar upload (base64 image)
        if 'avatar' in data and data['avatar']:
            try:
                avatar_data = data['avatar']
                if avatar_data.startswith('data:image'):
                    # Extract base64 data
                    header, encoded = avatar_data.split(',', 1)
                    
                    # Create uploads directory if it doesn't exist
                    upload_dir = os.path.join('static', 'uploads', 'avatars')
                    os.makedirs(upload_dir, exist_ok=True)
                    
                    # Generate unique filename
                    file_extension = 'jpg'  # Default to jpg
                    if 'image/png' in header:
                        file_extension = 'png'
                    elif 'image/jpeg' in header or 'image/jpg' in header:
                        file_extension = 'jpg'
                    
                    filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{file_extension}"
                    filepath = os.path.join(upload_dir, filename)
                    
                    # Save the file
                    with open(filepath, 'wb') as f:
                        f.write(base64.b64decode(encoded))
                    
                    # Store relative path in database
                    current_user.avatar = f"/static/uploads/avatars/{filename}"
            except Exception as avatar_error:
                print(f"Avatar upload error: {avatar_error}")
                # Don't fail the entire request if avatar upload fails
                pass
        
        db.session.commit()
        return jsonify(current_user.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Profile update error: {e}")
        return jsonify({'message': str(e)}), 400

@profile_bp.route('/avatar', methods=['POST'])
@token_required
def upload_avatar(current_user):
    """Upload user avatar image"""
    try:
        if 'avatar' not in request.files:
            return jsonify({'message': 'No avatar file provided'}), 400
        
        file = request.files['avatar']
        if file.filename == '':
            return jsonify({'message': 'No file selected'}), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        
        if file_extension not in allowed_extensions:
            return jsonify({'message': 'Invalid file type. Please upload PNG, JPG, or GIF'}), 400
        
        # Create uploads directory if it doesn't exist
        upload_dir = os.path.join('static', 'uploads', 'avatars')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{file_extension}"
        filepath = os.path.join(upload_dir, filename)
        
        # Save the file
        file.save(filepath)
        
        # Update user avatar path
        current_user.avatar = f"/static/uploads/avatars/{filename}"
        db.session.commit()
        
        return jsonify({
            'message': 'Avatar updated successfully',
            'avatar_url': current_user.avatar,
            'user': current_user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Avatar upload error: {e}")
        return jsonify({'message': str(e)}), 500

@profile_bp.route('/settings', methods=['GET'])
@token_required
def get_user_settings(current_user):
    """Get user notification and preference settings"""
    try:
        # For now, return default settings - this can be expanded with a UserSettings model
        settings = {
            'email_notifications': True,
            'push_notifications': True,
            'order_updates': True,
            'system_alerts': True,
            'theme': 'light'
        }
        return jsonify(settings), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@profile_bp.route('/settings', methods=['PUT'])
@token_required
def update_user_settings(current_user):
    """Update user notification and preference settings"""
    try:
        data = request.get_json()
        
        # For now, just return success - this can be expanded with a UserSettings model
        # In a real application, you would save these settings to a database
        
        return jsonify({
            'message': 'Settings updated successfully',
            'settings': data
        }), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400