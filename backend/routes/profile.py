from flask import Blueprint, request, jsonify, send_file
from werkzeug.security import check_password_hash
from sqlalchemy import func, desc
from models import db, WorkOrder, WorkOrderStatus, ManufacturingOrder, WorkCenter
from utils import token_required
import os
import base64
import uuid
import io
from datetime import datetime, timedelta
from ai_service import ai_report_generator
from pdf_export import pdf_exporter

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

@profile_bp.route('/reports', methods=['GET'])
@token_required
def get_profile_reports(current_user):
    """Get user's completed work orders and work duration statistics"""
    try:
        # Get query parameters for filtering
        period = request.args.get('period', 'all')  # all, week, month, year
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        
        # Base query for user's completed work orders
        base_query = WorkOrder.query.filter(
            WorkOrder.assigned_user_id == current_user.id,
            WorkOrder.status == WorkOrderStatus.COMPLETED
        )
        
        # Apply time filtering
        now = datetime.utcnow()
        if period == 'week':
            start_date = now - timedelta(weeks=1)
            base_query = base_query.filter(WorkOrder.completed_at >= start_date)
        elif period == 'month':
            start_date = now - timedelta(days=30)
            base_query = base_query.filter(WorkOrder.completed_at >= start_date)
        elif period == 'year':
            start_date = now - timedelta(days=365)
            base_query = base_query.filter(WorkOrder.completed_at >= start_date)
        
        # Get paginated completed work orders
        completed_work_orders_query = base_query.order_by(desc(WorkOrder.completed_at))
        total_orders = completed_work_orders_query.count()
        
        # Calculate pagination offset
        offset = (page - 1) * limit
        completed_work_orders = completed_work_orders_query.offset(offset).limit(limit).all()
        
        # Calculate summary statistics for all time (not just current page/period)
        all_time_query = WorkOrder.query.filter(
            WorkOrder.assigned_user_id == current_user.id,
            WorkOrder.status == WorkOrderStatus.COMPLETED
        )
        
        # Get statistics
        stats_result = db.session.query(
            func.count(WorkOrder.id).label('total_completed'),
            func.sum(WorkOrder.actual_duration_minutes).label('total_duration'),
            func.avg(WorkOrder.actual_duration_minutes).label('avg_duration'),
            func.sum(WorkOrder.actual_cost).label('total_cost')
        ).filter(
            WorkOrder.assigned_user_id == current_user.id,
            WorkOrder.status == WorkOrderStatus.COMPLETED
        ).first()
        
        # Get period-specific statistics if not 'all'
        period_stats = None
        if period != 'all':
            period_stats_result = db.session.query(
                func.count(WorkOrder.id).label('total_completed'),
                func.sum(WorkOrder.actual_duration_minutes).label('total_duration'),
                func.avg(WorkOrder.actual_duration_minutes).label('avg_duration'),
                func.sum(WorkOrder.actual_cost).label('total_cost')
            ).filter(
                WorkOrder.assigned_user_id == current_user.id,
                WorkOrder.status == WorkOrderStatus.COMPLETED,
                WorkOrder.completed_at >= start_date
            ).first()
            
            period_stats = {
                'total_completed': period_stats_result.total_completed or 0,
                'total_duration_minutes': int(period_stats_result.total_duration or 0),
                'total_duration_hours': round((period_stats_result.total_duration or 0) / 60, 2),
                'avg_duration_minutes': round(period_stats_result.avg_duration or 0, 2),
                'total_cost': round(period_stats_result.total_cost or 0, 2),
                'period': period
            }
        
        # Get recent work centers worked on
        recent_work_centers = db.session.query(
            WorkOrder.work_center_id,
            func.count(WorkOrder.id).label('order_count'),
            func.max(WorkOrder.completed_at).label('last_worked')
        ).filter(
            WorkOrder.assigned_user_id == current_user.id,
            WorkOrder.status == WorkOrderStatus.COMPLETED,
            WorkOrder.work_center_id.isnot(None)
        ).group_by(WorkOrder.work_center_id).order_by(desc('last_worked')).limit(5).all()
        
        # Format work center data
        work_centers_data = []
        for wc in recent_work_centers:
            work_center = WorkCenter.query.get(wc.work_center_id)
            if work_center:
                work_centers_data.append({
                    'work_center_id': wc.work_center_id,
                    'work_center_name': work_center.name,
                    'orders_completed': wc.order_count,
                    'last_worked': wc.last_worked.isoformat() if wc.last_worked else None
                })
        
        # Get productivity trends (last 30 days by day)
        thirty_days_ago = now - timedelta(days=30)
        daily_productivity = db.session.query(
            func.date(WorkOrder.completed_at).label('date'),
            func.count(WorkOrder.id).label('orders_completed'),
            func.sum(WorkOrder.actual_duration_minutes).label('total_minutes')
        ).filter(
            WorkOrder.assigned_user_id == current_user.id,
            WorkOrder.status == WorkOrderStatus.COMPLETED,
            WorkOrder.completed_at >= thirty_days_ago
        ).group_by(func.date(WorkOrder.completed_at)).order_by('date').all()
        
        productivity_data = [
            {
                'date': day.date.isoformat(),
                'orders_completed': day.orders_completed,
                'total_hours': round((day.total_minutes or 0) / 60, 2)
            }
            for day in daily_productivity
        ]
        
        # Format completed work orders for response
        work_orders_data = []
        for wo in completed_work_orders:
            work_order_data = wo.to_dict()
            # Add manufacturing order details
            if wo.manufacturing_order:
                work_order_data['manufacturing_order'] = {
                    'id': wo.manufacturing_order.id,
                    'product_name': wo.manufacturing_order.product_name,
                    'quantity': wo.manufacturing_order.quantity,
                    'status': wo.manufacturing_order.status.value
                }
            work_orders_data.append(work_order_data)
        
        # Prepare response
        response = {
            'user': {
                'id': current_user.id,
                'name': f"{current_user.first_name or ''} {current_user.last_name or ''}".strip(),
                'email': current_user.email,
                'department': current_user.department,
                'role': current_user.role.value
            },
            'summary': {
                'all_time': {
                    'total_completed': stats_result.total_completed or 0,
                    'total_duration_minutes': int(stats_result.total_duration or 0),
                    'total_duration_hours': round((stats_result.total_duration or 0) / 60, 2),
                    'avg_duration_minutes': round(stats_result.avg_duration or 0, 2),
                    'total_cost': round(stats_result.total_cost or 0, 2)
                },
                'period': period_stats
            },
            'completed_work_orders': {
                'data': work_orders_data,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total_orders,
                    'has_next': offset + limit < total_orders,
                    'has_prev': page > 1
                }
            },
            'work_centers': work_centers_data,
            'productivity_trend': productivity_data,
            'report_generated_at': now.isoformat()
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Profile reports error: {e}")
        return jsonify({'message': f'Failed to generate profile reports: {str(e)}'}), 500

@profile_bp.route('/ai-chat', methods=['POST'])
@token_required
def ai_chat_query(current_user):
    """Process AI chat query for report generation"""
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({'error': 'Query is required'}), 400
        
        user_query = data['query']
        time_period = data.get('time_period', 'all')
        
        print(f"🤖 Processing AI query: {user_query} for user {current_user.id}")
        
        # Process query through AI service
        result = ai_report_generator.process_user_query(
            user_query=user_query,
            user_id=current_user.id,
            time_period=time_period
        )
        
        # Add user context to response
        result['user'] = {
            'id': current_user.id,
            'name': f"{current_user.first_name or ''} {current_user.last_name or ''}".strip(),
            'email': current_user.email
        }
        
        result['timestamp'] = datetime.utcnow().isoformat()
        result['query'] = user_query
        result['time_period'] = time_period
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"AI chat error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'explanation': 'Failed to process AI query'
        }), 500

@profile_bp.route('/ai-suggestions', methods=['GET'])
@token_required
def get_ai_suggestions(current_user):
    """Get suggested queries for AI chat"""
    try:
        suggestions = [
            {
                'category': 'Productivity',
                'queries': [
                    "Show my productivity trend for the last month",
                    "How many work orders did I complete this week?",
                    "Compare my average completion time with estimates",
                    "Show my work efficiency by work center"
                ]
            },
            {
                'category': 'Cost Analysis',
                'queries': [
                    "What are my highest cost work orders?",
                    "Show cost breakdown by work center",
                    "Compare actual vs estimated costs",
                    "Show my total labor costs this month"
                ]
            },
            {
                'category': 'Time Analysis',
                'queries': [
                    "Show my work duration distribution",
                    "Which work orders took longer than expected?",
                    "Show my daily working hours trend",
                    "Compare my performance across different work centers"
                ]
            },
            {
                'category': 'Work Centers',
                'queries': [
                    "Which work centers do I use most?",
                    "Show my performance by work center",
                    "Compare efficiency across work centers",
                    "Show work center utilization patterns"
                ]
            }
        ]
        
        return jsonify({
            'suggestions': suggestions,
            'user_id': current_user.id
        }), 200
        
    except Exception as e:
        print(f"AI suggestions error: {e}")
        return jsonify({'error': str(e)}), 500

@profile_bp.route('/ai-chat/history', methods=['GET'])
@token_required
def get_chat_history(current_user):
    """Get chat history for the user (placeholder - can be implemented with database storage)"""
    try:
        # For now, return empty history
        # In production, you would store chat history in a database
        return jsonify({
            'history': [],
            'user_id': current_user.id,
            'message': 'Chat history storage not implemented yet'
        }), 200
        
    except Exception as e:
        print(f"Chat history error: {e}")
        return jsonify({'error': str(e)}), 500

@profile_bp.route('/ai-chat/export-pdf', methods=['POST'])
@token_required
def export_chat_to_pdf(current_user):
    """Export AI chat conversation to PDF"""
    try:
        data = request.get_json()
        
        if not data or 'messages' not in data:
            return jsonify({'error': 'Messages are required'}), 400
        
        messages = data['messages']
        time_period = data.get('time_period', 'all')
        
        # Prepare user info for PDF
        user_info = {
            'first_name': current_user.first_name or '',
            'last_name': current_user.last_name or '',
            'email': current_user.email,
            'department': current_user.department,
            'role': current_user.role.value if current_user.role else 'N/A'
        }
        
        print(f"📄 Generating PDF export for user {current_user.id} with {len(messages)} messages")
        
        # Generate PDF
        pdf_data = pdf_exporter.export_chat_to_pdf(
            messages=messages,
            user_info=user_info,
            time_period=time_period
        )
        
        # Create filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"AI_Report_Chat_{current_user.id}_{timestamp}.pdf"
        
        # Create file-like object
        pdf_buffer = io.BytesIO(pdf_data)
        pdf_buffer.seek(0)
        
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"PDF export error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'message': 'Failed to export chat to PDF'
        }), 500