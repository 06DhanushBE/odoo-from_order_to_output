import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import jwt
from datetime import datetime, timedelta
from functools import wraps
from models import db, User, ManufacturingOrder, BillOfMaterial, Component, BOMComponent, WorkOrder, OrderStatus, UserRole, PasswordReset
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///manufacturing.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

# Initialize database
db.init_app(app)

# Email configuration
def send_otp_email(email, otp):
    """Send OTP via email with improved error handling and connection management"""
    try:
        # Get email configuration from environment variables
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        email_user = os.getenv('EMAIL_USER')
        email_password = os.getenv('EMAIL_PASSWORD')
        
        print(f"🔄 Attempting to send OTP email to {email}")
        print(f"📧 Using SMTP: {smtp_server}:{smtp_port}")
        print(f"👤 From: {email_user}")
        
        # If email credentials are configured, send actual email
        if email_user and email_password:
            try:
                # Create email message
                msg = MIMEMultipart()
                msg['From'] = email_user
                msg['To'] = email
                msg['Subject'] = "Manufacturing System - Password Reset OTP"
                
                # Create HTML email body
                html_body = f"""
                <html>
                <body>
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1976d2;">Password Reset Request</h2>
                        <p>You have requested to reset your password for the Manufacturing System.</p>
                        <p>Your One-Time Password (OTP) is:</p>
                        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                            <span style="font-size: 32px; font-weight: bold; color: #1976d2; letter-spacing: 8px;">{otp}</span>
                        </div>
                        <p><strong>Important:</strong></p>
                        <ul>
                            <li>This OTP will expire in 15 minutes</li>
                            <li>Do not share this OTP with anyone</li>
                            <li>If you didn't request this, please ignore this email</li>
                        </ul>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #666; font-size: 12px;">
                            This is an automated email from Manufacturing System. Please do not reply to this email.
                        </p>
                    </div>
                </body>
                </html>
                """
                
                msg.attach(MIMEText(html_body, 'html'))
                
                # Connect to server and send email with better error handling
                print("🔄 Connecting to SMTP server...")
                server = smtplib.SMTP(smtp_server, smtp_port)
                
                print("🔄 Starting TLS encryption...")
                server.starttls()
                
                print("🔄 Authenticating...")
                server.login(email_user, email_password)
                
                print("🔄 Sending email...")
                text = msg.as_string()
                server.sendmail(email_user, email, text)
                
                print("🔄 Closing connection...")
                server.quit()
                
                print(f"✅ OTP email sent successfully to {email}")
                return True
                
            except smtplib.SMTPAuthenticationError as auth_error:
                print(f"❌ SMTP Authentication failed: {str(auth_error)}")
                print("💡 Check if you're using the correct App Password for Gmail")
                print("💡 Make sure 2-factor authentication is enabled")
                return False
                
            except smtplib.SMTPConnectError as conn_error:
                print(f"❌ SMTP Connection failed: {str(conn_error)}")
                print("💡 Check your internet connection and firewall settings")
                return False
                
            except smtplib.SMTPRecipientsRefused as recip_error:
                print(f"❌ Recipient refused: {str(recip_error)}")
                print("💡 Check if the recipient email address is valid")
                return False
                
            except smtplib.SMTPException as smtp_error:
                print(f"❌ SMTP error: {str(smtp_error)}")
                return False
                
            except Exception as email_error:
                print(f"❌ Unexpected email error: {str(email_error)}")
                print(f"Error type: {type(email_error).__name__}")
                return False
        else:
            # No email credentials configured - show in console for development
            print(f"\n{'='*50}")
            print(f"📧 EMAIL SIMULATION (No credentials configured)")
            print(f"{'='*50}")
            print(f"To: {email}")
            print(f"Subject: Manufacturing System - Password Reset OTP")
            print(f"")
            print(f"Your OTP for password reset is: {otp}")
            print(f"This OTP will expire in 15 minutes.")
            print(f"")
            print(f"💡 To enable actual email sending:")
            print(f"   1. Set EMAIL_USER and EMAIL_PASSWORD in .env file")
            print(f"   2. Use Gmail App Password for EMAIL_PASSWORD")
            print(f"{'='*50}\n")
            return True
            
    except Exception as e:
        print(f"❌ Critical error in email function: {str(e)}")
        print(f"📧 EMERGENCY FALLBACK - OTP for {email}: {otp}")
        return False

# JWT token decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'message': 'Token is missing!'}), 401
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['user_id']).first()
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# Authentication endpoints
@app.route('/api/auth/register', methods=['POST'])
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

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user = User.query.filter_by(email=data['email']).first()
        
        if user and user.check_password(data['password']):
            token = jwt.encode({
                'user_id': user.id,
                'exp': datetime.utcnow() + timedelta(hours=24)
            }, app.config['SECRET_KEY'], algorithm="HS256")
            
            return jsonify({
                'token': token,
                'user': user.to_dict()
            }), 200
        
        return jsonify({'message': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/auth/forgot-password', methods=['POST'])
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
        print(f"❌ Error in forgot_password endpoint: {str(e)}")
        return jsonify({'message': f'Server error: {str(e)}'}), 500

@app.route('/api/auth/test-email', methods=['POST'])
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

@app.route('/api/auth/verify-otp', methods=['POST'])
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

@app.route('/api/auth/reset-password', methods=['POST'])
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

# Manufacturing Order endpoints
@app.route('/api/manufacturing-orders', methods=['GET'])
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

@app.route('/api/manufacturing-orders/<order_id>', methods=['GET'])
@token_required
def get_manufacturing_order(current_user, order_id):
    try:
        order = ManufacturingOrder.query.get_or_404(order_id)
        return jsonify(order.to_dict()), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/manufacturing-orders', methods=['POST'])
@token_required
def create_manufacturing_order(current_user):
    try:
        data = request.get_json()
        
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
            bom_id=data['bom_id']
        )
        
        db.session.add(order)
        db.session.commit()
        
        return jsonify(order.to_dict()), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/manufacturing-orders/<order_id>', methods=['PUT'])
@token_required
def update_manufacturing_order(current_user, order_id):
    try:
        order = ManufacturingOrder.query.get_or_404(order_id)
        data = request.get_json()
        
        if 'status' in data:
            try:
                order.status = OrderStatus(data['status'])
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
        
        return jsonify(order.to_dict()), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

# BOM endpoints
@app.route('/api/boms', methods=['GET'])
@token_required
def get_boms(current_user):
    try:
        boms = BillOfMaterial.query.all()
        return jsonify([bom.to_dict() for bom in boms]), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/boms', methods=['POST'])
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

# Stock/Component endpoints
@app.route('/api/stock', methods=['GET'])
@token_required
def get_stock(current_user):
    try:
        components = Component.query.all()
        return jsonify([component.to_dict() for component in components]), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/components', methods=['POST'])
@token_required
def create_component(current_user):
    try:
        data = request.get_json()
        
        component = Component(
            name=data['name'],
            quantity_on_hand=data.get('quantity_on_hand', 0)
        )
        
        db.session.add(component)
        db.session.commit()
        
        return jsonify(component.to_dict()), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/components/<int:component_id>', methods=['PUT'])
@token_required
def update_component(current_user, component_id):
    try:
        component = Component.query.get_or_404(component_id)
        data = request.get_json()
        
        if 'name' in data:
            component.name = data['name']
        if 'quantity_on_hand' in data:
            component.quantity_on_hand = data['quantity_on_hand']
        
        db.session.commit()
        
        return jsonify(component.to_dict()), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

# Dashboard summary endpoint
@app.route('/api/dashboard/summary', methods=['GET'])
@token_required
def get_dashboard_summary(current_user):
    try:
        summary = {}
        for status in OrderStatus:
            count = ManufacturingOrder.query.filter(ManufacturingOrder.status == status).count()
            summary[status.value] = count
        
        # Additional dashboard metrics
        summary['total_components'] = Component.query.count()
        summary['total_boms'] = BillOfMaterial.query.count()
        summary['low_stock_components'] = Component.query.filter(Component.quantity_on_hand < 10).count()
        
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

# Work Order endpoints
@app.route('/api/work-orders/<order_id>', methods=['GET'])
@token_required
def get_work_orders(current_user, order_id):
    try:
        work_orders = WorkOrder.query.filter_by(manufacturing_order_id=order_id).all()
        return jsonify([wo.to_dict() for wo in work_orders]), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/work-orders/<int:work_order_id>', methods=['PUT'])
@token_required
def update_work_order(current_user, work_order_id):
    try:
        work_order = WorkOrder.query.get_or_404(work_order_id)
        data = request.get_json()
        
        if 'status' in data:
            try:
                from models import WorkOrderStatus
                work_order.status = WorkOrderStatus(data['status'])
            except ValueError:
                return jsonify({'message': 'Invalid status'}), 400
        
        db.session.commit()
        
        return jsonify(work_order.to_dict()), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

# Initialize database tables
def create_tables():
    db.create_all()
    
    # Create sample data if tables are empty
    if User.query.count() == 0:
        # Create admin user
        admin = User(email='admin@example.com', role=UserRole.ADMIN)
        admin.set_password('admin123')
        db.session.add(admin)
        
        # Create operator user
        operator = User(email='operator@example.com', role=UserRole.OPERATOR)
        operator.set_password('operator123')
        db.session.add(operator)
        
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
        
        # Create sample work orders
        work_orders = [
            WorkOrder(name='Cutting', duration_minutes=120, manufacturing_order_id='MO-001'),
            WorkOrder(name='Assembly', duration_minutes=180, manufacturing_order_id='MO-001'),
            WorkOrder(name='Finishing', duration_minutes=90, manufacturing_order_id='MO-001')
        ]
        
        for wo in work_orders:
            db.session.add(wo)
        
        db.session.commit()
        print("Sample data created successfully!")

if __name__ == '__main__':
    with app.app_context():
        create_tables()
    app.run(debug=True, host='0.0.0.0', port=8000)