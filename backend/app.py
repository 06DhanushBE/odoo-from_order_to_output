import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import jwt
from datetime import datetime, timedelta
from functools import wraps
from models import db, User, ManufacturingOrder, BillOfMaterial, Component, BOMComponent, WorkOrder, OrderStatus, UserRole, PasswordReset, WorkCenter, Product, StockMovement, WorkOrderStatus
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/manufacturing_system_db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

# Initialize database and migrations
db.init_app(app)
migrate = Migrate(app, db)

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
        email = data.get('email')
        password = data.get('password')
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({'message': 'Invalid credentials'}), 401
        
        if user.check_password(password):
            token = jwt.encode({
                'user_id': user.id,
                'exp': datetime.utcnow() + timedelta(hours=24)
            }, app.config['SECRET_KEY'], algorithm="HS256")
            
            return jsonify({
                'token': token,
                'user': user.to_dict()
            }), 200
        else:
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

@app.route('/api/manufacturing-orders/<order_id>/complete', methods=['POST'])
@token_required
def complete_manufacturing_order(current_user, order_id):
    try:
        order = ManufacturingOrder.query.get_or_404(order_id)
        
        if order.status == OrderStatus.DONE:
            return jsonify({'message': 'Manufacturing order is already completed'}), 400
        
        # Get the BOM and components
        bom = order.bill_of_material
        stock_movements = []
        
        # Consume components from stock
        for bom_component in bom.components:
            required_quantity = bom_component.quantity_required * order.quantity
            component = bom_component.component
            
            if component.quantity_on_hand >= required_quantity:
                # Create OUT movement for component consumption
                movement = StockMovement(
                    component_id=component.id,
                    movement_type='OUT',
                    quantity=required_quantity,
                    reference=f'Consumed for MO-{order.id} - {order.product_name}',
                    created_at=datetime.utcnow()
                )
                db.session.add(movement)
                stock_movements.append(movement)
                
                # Update component stock
                component.quantity_on_hand -= required_quantity
            else:
                return jsonify({
                    'message': f'Insufficient stock for {component.name}. Required: {required_quantity}, Available: {component.quantity_on_hand}'
                }), 400
        
        # Update order status
        order.status = OrderStatus.DONE
        order.completed_at = datetime.utcnow()
        
        # Update all work orders to completed
        for work_order in order.work_orders:
            work_order.status = WorkOrderStatus.COMPLETED
            work_order.completed_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Manufacturing order completed successfully',
            'order': order.to_dict(),
            'stock_movements': [movement.to_dict() for movement in stock_movements]
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@app.route('/api/manufacturing-orders/<order_id>', methods=['DELETE'])
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

@app.route('/api/boms/<int:bom_id>', methods=['DELETE'])
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

# Stock/Component endpoints
@app.route('/api/stock', methods=['GET'])
@token_required
def get_stock(current_user):
    try:
        components = Component.query.all()
        return jsonify([component.to_dict() for component in components]), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/stock/movements', methods=['GET'])
@token_required
def get_stock_movements(current_user):
    try:
        movements = StockMovement.query.order_by(StockMovement.created_at.desc()).limit(100).all()
        return jsonify([movement.to_dict() for movement in movements]), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/stock/movements', methods=['POST'])
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

@app.route('/api/components/<int:component_id>/update-price', methods=['PUT'])
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

@app.route('/api/components', methods=['POST'])
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

@app.route('/api/components/<int:component_id>', methods=['PUT'])
@token_required
def update_component(current_user, component_id):
    try:
        component = Component.query.get_or_404(component_id)
        data = request.get_json()
        
        old_quantity = component.quantity_on_hand
        
        if 'name' in data:
            component.name = data['name']
        if 'unit_cost' in data:
            component.unit_cost = data['unit_cost']
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

@app.route('/api/components/<int:component_id>', methods=['DELETE'])
@token_required
def delete_component(current_user, component_id):
    try:
        component = Component.query.get_or_404(component_id)
        

        
        # Delete the component
        db.session.delete(component)
        db.session.commit()
        

        return jsonify({'message': 'Component deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()

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

# =================== WORK CENTER ENDPOINTS ===================

@app.route('/api/workcenters', methods=['GET'])
def get_work_centers():
    try:
        work_centers = WorkCenter.query.filter_by(is_active=True).all()
        return jsonify([wc.to_dict() for wc in work_centers]), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/workcenters', methods=['POST'])
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

# =================== ENHANCED WORK ORDER ENDPOINTS ===================

@app.route('/api/work-orders/<int:wo_id>/start', methods=['POST'])
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

@app.route('/api/work-orders/<int:wo_id>/complete', methods=['POST'])
@token_required
def complete_work_order(current_user, wo_id):
    try:
        work_order = WorkOrder.query.get_or_404(wo_id)
        data = request.get_json() or {}
        
        if work_order.status not in [WorkOrderStatus.STARTED, WorkOrderStatus.PAUSED]:
            return jsonify({'message': 'Work order must be started or paused to complete'}), 400
        
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
        
        db.session.commit()
        return jsonify(work_order.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

# =================== PROFILE ENDPOINTS ===================

@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    try:
        return jsonify(current_user.to_dict()), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    try:
        data = request.get_json()
        
        current_user.first_name = data.get('first_name', current_user.first_name)
        current_user.last_name = data.get('last_name', current_user.last_name)
        current_user.phone = data.get('phone', current_user.phone)
        current_user.department = data.get('department', current_user.department)
        
        if 'new_password' in data and data['new_password']:
            current_user.set_password(data['new_password'])
        
        db.session.commit()
        return jsonify(current_user.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

def create_sample_data():
    """Create sample data if tables are empty"""
    if WorkCenter.query.count() == 0:
        # Get existing users
        admin = User.query.filter_by(email='admin@example.com').first()
        operator = User.query.filter_by(email='operator@example.com').first()
        
        if not admin:
            admin = User(
                email='admin@example.com', 
                role=UserRole.ADMIN,
                first_name='Admin',
                last_name='User',
                department='Management'
            )
            admin.set_password('admin123')
            db.session.add(admin)
        
        if not operator:
            operator = User(
                email='operator@example.com', 
                role=UserRole.OPERATOR,
                first_name='John',
                last_name='Doe',
                department='Production',
                phone='555-0123'
            )
            operator.set_password('operator123')
            db.session.add(operator)
        
        # Create work centers
        work_centers = [
            WorkCenter(name='Assembly Line 1', cost_per_hour=25.0, capacity=2, description='Primary assembly station'),
            WorkCenter(name='Cutting Station', cost_per_hour=30.0, capacity=1, description='Wood cutting and preparation'),
            WorkCenter(name='Finishing Station', cost_per_hour=20.0, capacity=1, description='Sanding and finishing'),
            WorkCenter(name='Quality Control', cost_per_hour=35.0, capacity=1, description='Quality inspection station')
        ]
        
        for wc in work_centers:
            db.session.add(wc)
        
        db.session.flush()  # Get IDs for work centers
        
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
        
        # Create sample work orders with work center assignments
        work_orders = [
            WorkOrder(
                name='Cutting', 
                duration_minutes=120, 
                manufacturing_order_id='MO-001',
                work_center_id=work_centers[1].id,  # Cutting Station
                assigned_user_id=operator.id
            ),
            WorkOrder(
                name='Assembly', 
                duration_minutes=180, 
                manufacturing_order_id='MO-001',
                work_center_id=work_centers[0].id,  # Assembly Line 1
                assigned_user_id=operator.id
            ),
            WorkOrder(
                name='Finishing', 
                duration_minutes=90, 
                manufacturing_order_id='MO-001',
                work_center_id=work_centers[2].id,  # Finishing Station
                assigned_user_id=operator.id
            ),
            WorkOrder(
                name='Quality Check', 
                duration_minutes=30, 
                manufacturing_order_id='MO-001',
                work_center_id=work_centers[3].id,  # Quality Control
                assigned_user_id=admin.id
            )
        ]
        
        for wo in work_orders:
            db.session.add(wo)
        
        db.session.commit()
        print("Sample data created successfully!")

if __name__ == '__main__':
    with app.app_context():
        create_tables()
        create_sample_data()
    app.run(debug=True, host='0.0.0.0', port=8000)