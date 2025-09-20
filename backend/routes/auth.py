import os
import jwt
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from models import db, User, PasswordReset, UserRole
from utils import send_otp_email

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
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

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({'message': 'Invalid credentials'}), 401
        
        if user.check_password(password):
            token = jwt.encode({
                'user_id': user.id,
                'exp': datetime.utcnow() + timedelta(hours=24)
            }, current_app.config['SECRET_KEY'], algorithm="HS256")
            
            return jsonify({
                'token': token,
                'user': user.to_dict()
            }), 200
        else:
            return jsonify({'message': 'Invalid credentials'}), 401
        
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'message': 'Email is required'}), 400
        
        # Check if user exists
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'message': 'User with this email does not exist'}), 404
        
        # Create password reset request with OTP
        reset_request = PasswordReset.create_reset_request(email)
        
        # Send OTP via email
        email_sent = send_otp_email(email, reset_request.otp)
        
        # Check if email credentials are configured
        email_user = os.getenv('EMAIL_USER')
        email_password = os.getenv('EMAIL_PASSWORD')
        
        if email_sent:
            response_data = {
                'message': 'OTP sent successfully to your email address',
                'reset_id': reset_request.id,
                'email_sent': True
            }
            
            # For development: include OTP in response if email is not configured
            if not email_user or not email_password:
                response_data['dev_otp'] = reset_request.otp
                response_data['dev_message'] = 'Email credentials not configured. Check console for OTP.'
            
            return jsonify(response_data), 200
        else:
            # Email failed to send but OTP is still created
            response_data = {
                'message': 'Failed to send email. Please contact administrator.',
                'reset_id': reset_request.id,
                'email_sent': False,
                'dev_otp': reset_request.otp,  # Include OTP for development/debugging
                'dev_message': 'Email sending failed. Use this OTP for testing.'
            }
            return jsonify(response_data), 206  # 206 Partial Content - OTP created but email failed
            
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500

@auth_bp.route('/test-email', methods=['POST'])
def test_email():
    """Test email configuration without creating an OTP"""
    try:
        data = request.get_json()
        test_email = data.get('email', 'test@example.com')
        
        # Get email configuration
        email_user = os.getenv('EMAIL_USER')
        email_password = os.getenv('EMAIL_PASSWORD')
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        
        if not email_user or not email_password:
            return jsonify({
                'status': 'not_configured',
                'message': 'Email credentials not configured',
                'email_user': email_user,
                'smtp_server': smtp_server,
                'smtp_port': smtp_port
            }), 200
        
        # Test sending a simple email
        test_otp = "123456"  # Test OTP
        success = send_otp_email(test_email, test_otp)
        
        return jsonify({
            'status': 'success' if success else 'failed',
            'message': 'Email test completed',
            'email_sent': success,
            'email_user': email_user,
            'smtp_server': smtp_server,
            'smtp_port': smtp_port
        }), 200 if success else 500
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Test failed: {str(e)}'
        }), 500

@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    try:
        data = request.get_json()
        email = data.get('email')
        otp = data.get('otp')
        
        if not email or not otp:
            return jsonify({'message': 'Email and OTP are required'}), 400
        
        # Find the latest unused reset request for this email
        reset_request = PasswordReset.query.filter_by(
            email=email, 
            otp=otp, 
            is_used=False
        ).first()
        
        if not reset_request:
            return jsonify({'message': 'Invalid OTP'}), 400
        
        if not reset_request.is_valid():
            return jsonify({'message': 'OTP has expired'}), 400
        
        return jsonify({
            'message': 'OTP verified successfully',
            'reset_id': reset_request.id
        }), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        email = data.get('email')
        otp = data.get('otp')
        new_password = data.get('new_password')
        
        if not all([email, otp, new_password]):
            return jsonify({'message': 'Email, OTP and new password are required'}), 400
        
        # Find the reset request
        reset_request = PasswordReset.query.filter_by(
            email=email,
            otp=otp,
            is_used=False
        ).first()
        
        if not reset_request or not reset_request.is_valid():
            return jsonify({'message': 'Invalid or expired OTP'}), 400
        
        # Find the user and update password
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Update password
        user.set_password(new_password)
        
        # Mark OTP as used
        reset_request.mark_as_used()
        
        db.session.commit()
        
        return jsonify({'message': 'Password reset successfully'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400