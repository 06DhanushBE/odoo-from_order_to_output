import os
import jwt
import smtplib
from functools import wraps
from flask import request, jsonify, current_app
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from models import User

def token_required(f):
    """JWT token decorator for protected routes"""
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
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['user_id']).first()
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

def send_otp_email(email, otp):
    """Send OTP via email with improved error handling and connection management"""
    try:
        # Get email configuration from environment variables
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        email_user = os.getenv('EMAIL_USER')
        email_password = os.getenv('EMAIL_PASSWORD')
        

        
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
                
                # Connect to server and send email
                server = smtplib.SMTP(smtp_server, smtp_port)
                server.starttls()
                server.login(email_user, email_password)
                
                text = msg.as_string()
                server.sendmail(email_user, email, text)
                server.quit()
                
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