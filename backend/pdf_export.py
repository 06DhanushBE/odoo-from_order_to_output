"""
PDF Export Service for AI Chat Reports
"""
import io
import base64
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import json
import plotly.graph_objects as go
import plotly.io as pio

class ChatPDFExporter:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()
    
    def setup_custom_styles(self):
        """Setup custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Title'],
            fontSize=18,
            textColor=colors.darkblue,
            spaceAfter=20,
            alignment=TA_CENTER
        ))
        
        self.styles.add(ParagraphStyle(
            name='ChatUser',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.darkblue,
            backColor=colors.lightblue,
            borderPadding=8,
            spaceAfter=10,
            alignment=TA_RIGHT
        ))
        
        self.styles.add(ParagraphStyle(
            name='ChatAI',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.black,
            backColor=colors.lightgrey,
            borderPadding=8,
            spaceAfter=10,
            alignment=TA_LEFT
        ))
        
        self.styles.add(ParagraphStyle(
            name='ChatTimestamp',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.grey,
            spaceAfter=5
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=12,
            textColor=colors.darkblue,
            spaceAfter=10
        ))
    
    def export_chat_to_pdf(self, messages, user_info, time_period='all'):
        """Export chat messages to PDF"""
        buffer = io.BytesIO()
        
        # Create PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Build story (content)
        story = []
        
        # Add header
        story.append(Paragraph("AI Manufacturing Report Chat", self.styles['CustomTitle']))
        story.append(Spacer(1, 20))
        
        # Add metadata
        metadata_data = [
            ['Report Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
            ['User:', f"{user_info.get('first_name', '')} {user_info.get('last_name', '')}"],
            ['Email:', user_info.get('email', 'N/A')],
            ['Department:', user_info.get('department', 'N/A')],
            ['Time Period:', time_period.title()],
            ['Total Messages:', str(len(messages))]
        ]
        
        metadata_table = Table(metadata_data, colWidths=[2*inch, 3*inch])
        metadata_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(metadata_table)
        story.append(Spacer(1, 20))
        
        # Add chat messages
        story.append(Paragraph("Chat Conversation", self.styles['SectionHeader']))
        story.append(Spacer(1, 10))
        
        for msg in messages:
            # Add timestamp
            timestamp = datetime.fromisoformat(msg['timestamp'].replace('Z', '+00:00'))
            story.append(Paragraph(
                f"[{timestamp.strftime('%H:%M:%S')}]",
                self.styles['ChatTimestamp']
            ))
            
            # Add message content
            if msg['type'] == 'user':
                story.append(Paragraph(
                    f"<b>You:</b> {msg['content']}",
                    self.styles['ChatUser']
                ))
            else:
                story.append(Paragraph(
                    f"<b>AI Assistant:</b> {msg['content']}",
                    self.styles['ChatAI']
                ))
            
            # Add data summary if available
            if msg.get('data') and len(msg['data']) > 0:
                story.append(Paragraph(
                    f"<b>Data Summary:</b> {len(msg['data'])} records found",
                    self.styles['Normal']
                ))
                
                # Add sample data (first few records)
                if len(msg['data']) > 0:
                    sample_data = msg['data'][:3]  # Show first 3 records
                    
                    # Convert data to table format
                    if sample_data:
                        headers = list(sample_data[0].keys())
                        table_data = [headers]
                        
                        for record in sample_data:
                            row = []
                            for header in headers:
                                value = str(record.get(header, ''))
                                # Truncate long values
                                if len(value) > 30:
                                    value = value[:27] + '...'
                                row.append(value)
                            table_data.append(row)
                        
                        # Create table
                        data_table = Table(table_data, repeatRows=1)
                        data_table.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                            ('FONTSIZE', (0, 0), (-1, -1), 8),
                            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                            ('GRID', (0, 0), (-1, -1), 1, colors.black)
                        ]))
                        
                        story.append(data_table)
            
            # Add SQL query if available
            if msg.get('sql_query'):
                story.append(Paragraph(
                    f"<b>SQL Query:</b>",
                    self.styles['Normal']
                ))
                story.append(Paragraph(
                    f"<font name='Courier' size=8>{msg['sql_query']}</font>",
                    self.styles['Normal']
                ))
            
            story.append(Spacer(1, 15))
        
        # Add footer
        story.append(PageBreak())
        story.append(Paragraph("Report Summary", self.styles['SectionHeader']))
        
        # Count message types
        user_messages = len([m for m in messages if m['type'] == 'user'])
        ai_messages = len([m for m in messages if m['type'] == 'ai'])
        successful_queries = len([m for m in messages if m.get('success') == True])
        
        summary_data = [
            ['User Questions:', str(user_messages)],
            ['AI Responses:', str(ai_messages)],
            ['Successful Queries:', str(successful_queries)],
            ['Charts Generated:', str(len([m for m in messages if m.get('chart_json')]))],
        ]
        
        summary_table = Table(summary_data, colWidths=[2*inch, 1*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightblue),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(summary_table)
        
        # Add generation info
        story.append(Spacer(1, 20))
        story.append(Paragraph(
            f"Generated by Manufacturing AI Assistant on {datetime.now().strftime('%Y-%m-%d at %H:%M:%S')}",
            self.styles['Normal']
        ))
        
        # Build PDF
        doc.build(story)
        
        # Get PDF data
        pdf_data = buffer.getvalue()
        buffer.close()
        
        return pdf_data
    
    def create_chart_image(self, chart_json):
        """Convert Plotly chart JSON to image for PDF inclusion"""
        try:
            # Parse the chart JSON
            chart_data = json.loads(chart_json)
            
            # Create Plotly figure
            fig = go.Figure(data=chart_data['data'], layout=chart_data['layout'])
            
            # Convert to image
            img_bytes = pio.to_image(fig, format='png', width=600, height=400)
            
            # Convert to base64 for embedding
            img_base64 = base64.b64encode(img_bytes).decode()
            
            return img_base64
            
        except Exception as e:
            print(f"Error creating chart image: {e}")
            return None

# Global instance
pdf_exporter = ChatPDFExporter()