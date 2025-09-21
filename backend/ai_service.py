"""
AI Report Generator Service using LangChain, Groq, and RAG
"""
import os
import json
import plotly.graph_objects as go
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from sqlalchemy import text
from models import db, WorkOrder, WorkOrderStatus, ManufacturingOrder, User, WorkCenter
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Groq API from environment variable
GROQ_API_KEY = os.getenv('GROQ_API_KEY')


class AIReportGenerator:
    def __init__(self):
        self.llm = None  # Initialize lazily
        self.embeddings = None  # Initialize lazily
        self.vector_store = None
        self.knowledge_base = ""
        print("🤖 AI Report Generator initialized (lazy loading mode)")
        
    def _ensure_llm_initialized(self):
        """Initialize LLM lazily when first needed"""
        if self.llm is None:
            try:
                if not GROQ_API_KEY:
                    raise ValueError("GROQ_API_KEY not found in environment variables. Please check your .env file.")
                
                print("🔄 Initializing Groq LLM...")
                print(f"🔑 Using API key: {GROQ_API_KEY[:10]}...{GROQ_API_KEY[-4:]}")
                
                self.llm = ChatGroq(
                    temperature=0.1,
                    groq_api_key=GROQ_API_KEY,
                    model_name="llama-3.1-8b-instant"
                )
                self.knowledge_base = self._create_simple_knowledge_base()
                print("✅ LLM initialized successfully")
            except Exception as e:
                print(f"❌ Error initializing LLM: {e}")
                raise e
    
    def _create_knowledge_documents(self) -> List[Document]:
        """Create knowledge base documents"""
        documents = []
        
        # Database schema documentation
        schema_doc = Document(
            page_content="""
            Manufacturing System Database Schema:
            
            Users Table:
            - id: Primary key
            - email: User email
            - first_name, last_name: User names
            - role: ADMIN, MANAGER, OPERATOR
            - department: User department
            - phone: Contact number
            
            Work Orders Table:
            - id: Primary key
            - name: Work order name
            - status: PENDING, STARTED, PAUSED, COMPLETED
            - duration_minutes: Estimated duration
            - actual_duration_minutes: Actual time taken
            - started_at, completed_at: Timestamps
            - assigned_user_id: Worker assigned
            - work_center_id: Work center used
            - manufacturing_order_id: Parent manufacturing order
            - actual_cost: Cost incurred
            
            Manufacturing Orders Table:
            - id: Primary key (MO-001, MO-002, etc.)
            - product_name: Product being manufactured
            - quantity: Number of units
            - status: PLANNED, IN_PROGRESS, DONE, CANCELED
            - deadline: Due date
            - created_at, completed_at: Timestamps
            
            Work Centers Table:
            - id: Primary key
            - name: Work center name
            - cost_per_hour: Hourly rate
            - capacity: Number of parallel operations
            - efficiency: Efficiency factor
            
            Common Queries:
            - User productivity: Work orders completed by user
            - Time analysis: Duration vs estimates
            - Cost analysis: Actual vs estimated costs
            - Work center utilization: Usage patterns
            - Manufacturing efficiency: Order completion rates
            """,
            metadata={"source": "database_schema", "type": "schema"}
        )
        documents.append(schema_doc)
        
        # Plotly documentation for common charts
        plotly_doc = Document(
            page_content="""
            Plotly Chart Types and Usage:
            
            Bar Charts (plotly.graph_objects.Bar):
            - Use for categorical data comparison
            - Example: Work orders by user, costs by work center
            - Code: fig = go.Figure(data=go.Bar(x=categories, y=values))
            
            Line Charts (plotly.graph_objects.Scatter):
            - Use for time series data
            - Example: Productivity over time, cumulative costs
            - Code: fig = go.Figure(data=go.Scatter(x=dates, y=values, mode='lines'))
            
            Pie Charts (plotly.graph_objects.Pie):
            - Use for showing proportions
            - Example: Work distribution by department
            - Code: fig = go.Figure(data=go.Pie(labels=labels, values=values))
            
            Scatter Plots (plotly.graph_objects.Scatter):
            - Use for correlation analysis
            - Example: Duration vs cost analysis
            - Code: fig = go.Figure(data=go.Scatter(x=x_data, y=y_data, mode='markers'))
            
            Histograms (plotly.graph_objects.Histogram):
            - Use for distribution analysis
            - Example: Distribution of work order durations
            - Code: fig = go.Figure(data=go.Histogram(x=duration_data))
            
            Time Series (plotly.graph_objects.Scatter):
            - Use for trends over time
            - Example: Daily productivity trends
            - Code: fig = go.Figure(data=go.Scatter(x=dates, y=values, mode='lines+markers'))
            
            Chart Formatting:
            - Always add titles: fig.update_layout(title="Chart Title")
            - Add axis labels: fig.update_xaxes(title="X Axis"), fig.update_yaxes(title="Y Axis")
            - Use colors for clarity: color='blue', color_discrete_sequence=['#1f77b4', '#ff7f0e']
            - Return JSON: fig.to_json()
            """,
            metadata={"source": "plotly_docs", "type": "visualization"}
        )
        documents.append(plotly_doc)
        
        # Report types documentation
        reports_doc = Document(
            page_content="""
            Common Manufacturing Report Types:
            
            1. Productivity Reports:
            - Work orders completed per user
            - Average completion time
            - Efficiency metrics
            - Time period comparisons
            
            2. Cost Analysis Reports:
            - Actual vs estimated costs
            - Cost breakdown by work center
            - Labor cost analysis
            - Overhead cost tracking
            
            3. Work Center Utilization:
            - Usage hours per work center
            - Capacity utilization rates
            - Bottleneck identification
            - Maintenance schedules
            
            4. Quality Reports:
            - Defect rates
            - Quality check results
            - Rework requirements
            - Quality trends
            
            5. Time Analysis Reports:
            - Cycle time analysis
            - Lead time tracking
            - Delay analysis
            - Schedule adherence
            
            6. Manufacturing Order Reports:
            - Order status overview
            - Completion rates
            - Deadline adherence
            - Production volume
            """,
            metadata={"source": "report_types", "type": "business"}
        )
        documents.append(reports_doc)
        
        return documents
    
    def _create_simple_knowledge_base(self) -> str:
        """Create simple string-based knowledge base"""
        return """
        Manufacturing System Database Schema:
        
        Work Orders Table (work_orders):
        - id: Primary key
        - name: Work order name  
        - status: 'Pending', 'Started', 'Paused', 'Completed' (enum values)
        - duration_minutes: Estimated duration
        - actual_duration_minutes: Actual time taken
        - started_at, completed_at: Timestamps (can be NULL)
        - assigned_user_id: Worker assigned (can be NULL)
        - work_center_id: Work center used (can be NULL)
        - manufacturing_order_id: Parent manufacturing order ID
        - actual_cost, estimated_cost: Cost values
        - sequence: Order of operations
        - notes, issues: Text fields for details
        - quality_check: Boolean flag
        
        Users Table (users): 
        - id, email, first_name, last_name, role, department, is_active, created_at
        
        Manufacturing Orders Table (manufacturing_orders): 
        - id (string like 'MO-001'), product_name, quantity, status ('Planned', 'In Progress', 'Done', 'Canceled')
        - deadline, created_at, started_at, completed_at, priority, notes
        - bom_id: Bill of materials reference
        
        Work Centers Table (work_centers): 
        - id, name, description, cost_per_hour, capacity, efficiency, is_active, created_at
        
        Components Table (components):
        - id, name, quantity_on_hand, unit_cost, supplier, reorder_level
        
        Stock Movements Table (stock_movements):
        - id, component_id, movement_type ('in', 'out', 'adjustment'), quantity, reference, created_at
        
        Important Notes:
        - Use proper enum string values in queries: 'Completed', not 'COMPLETED'
        - Many foreign key fields can be NULL
        - Use DATE() function for date grouping
        - Use COALESCE for handling NULL values in calculations
        
        Common Chart Types:
        - Bar charts for comparisons (go.Bar)
        - Line charts for trends (go.Scatter with mode='lines')
        - Pie charts for proportions (go.Pie)
        """
    
    def query_database(self, query: str, user_id: int = None, start_date: datetime = None, end_date: datetime = None) -> List[Dict[str, Any]]:
        """Execute database query with optional filters"""
        try:
            with db.engine.connect() as conn:
                result = conn.execute(text(query))
                columns = result.keys()
                rows = result.fetchall()
                
                # Convert to list of dictionaries
                data = []
                for row in rows:
                    row_dict = {}
                    for i, col in enumerate(columns):
                        value = row[i]
                        # Handle datetime objects
                        if isinstance(value, datetime):
                            row_dict[col] = value.isoformat()
                        else:
                            row_dict[col] = value
                    data.append(row_dict)
                
                return data
        except Exception as e:
            print(f"Database query error: {e}")
            return []
    
    def generate_chart_code(self, chart_type: str, data: List[Dict], user_prompt: str) -> str:
        """Generate Plotly chart code based on user requirements"""
        
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", """You are an expert data visualization specialist. Generate Python code using Plotly that creates the requested chart.
            
            REQUIREMENTS:
            1. Use the provided data structure
            2. Create appropriate Plotly chart code
            3. Return only the Python code, no explanations
            4. Use plotly.graph_objects or plotly.express as appropriate
            5. Include proper titles, labels, and formatting
            6. End with fig.to_json() to return JSON format
            7. Handle any datetime strings by converting them if needed
            
            AVAILABLE DATA STRUCTURE:
            {data_sample}
            
            CHART TYPE REQUESTED: {chart_type}
            USER REQUEST: {user_prompt}
            
            Generate clean Python code that creates this visualization:"""),
            ("human", "Create the chart code now.")
        ])
        
        # Sample data for context
        data_sample = data[:3] if data else [{"example": "No data available"}]
        
        try:
            self._ensure_llm_initialized()
            response = self.llm.invoke(
                prompt_template.format_messages(
                    data_sample=str(data_sample),
                    chart_type=chart_type,
                    user_prompt=user_prompt
                )
            )
            
            # Extract code from response
            code = response.content.strip()
            
            # Clean up the code (remove markdown formatting if present)
            if code.startswith("```python"):
                code = code[9:]
            if code.startswith("```"):
                code = code[3:]
            if code.endswith("```"):
                code = code[:-3]
            
            return code.strip()
            
        except Exception as e:
            print(f"Error generating chart code: {e}")
            return self._fallback_chart_code(chart_type, data)
    
    def _fallback_chart_code(self, chart_type: str, data: List[Dict]) -> str:
        """Fallback chart generation if AI fails"""
        if not data:
            return "fig = go.Figure(); fig.add_annotation(text='No data available', x=0.5, y=0.5); fig.to_json()"
        
        if chart_type.lower() in ['bar', 'column']:
            return """
import plotly.graph_objects as go
fig = go.Figure(data=go.Bar(x=[str(item.get('name', item.get('id', i))) for i, item in enumerate(data)], 
                           y=[item.get('value', item.get('count', 1)) for item in data]))
fig.update_layout(title='Bar Chart')
fig.to_json()
"""
        else:
            return """
import plotly.graph_objects as go
fig = go.Figure(data=go.Scatter(x=list(range(len(data))), y=[1]*len(data), mode='markers'))
fig.update_layout(title='Data Visualization')
fig.to_json()
"""
    
    def execute_chart_code(self, code: str, data: List[Dict]) -> str:
        """Safely execute chart generation code"""
        try:
            # Create execution environment
            exec_globals = {
                'go': go,
                'data': data,
                'datetime': datetime,
                'timedelta': timedelta,
                'json': json
            }
            
            # Execute the code
            exec(code, exec_globals)
            
            # The code should create 'fig' variable and call fig.to_json()
            if 'fig' in exec_globals:
                return exec_globals['fig'].to_json()
            else:
                # If no fig variable, create a simple chart
                fallback_fig = go.Figure()
                fallback_fig.add_annotation(
                    text="Chart generation error",
                    x=0.5, y=0.5,
                    showarrow=False
                )
                return fallback_fig.to_json()
                
        except Exception as e:
            print(f"Chart execution error: {e}")
            # Return error chart
            error_fig = go.Figure()
            error_fig.add_annotation(
                text=f"Error: {str(e)[:100]}",
                x=0.5, y=0.5,
                showarrow=False
            )
            return error_fig.to_json()
    
    def process_user_query(self, user_query: str, user_id: int, time_period: str = "all") -> Dict[str, Any]:
        """Process user query and generate report with visualization"""
        
        # Calculate date range based on time period
        end_date = datetime.now()
        start_date = None
        date_filter_sql = ""
        
        if time_period == "month":
            start_date = end_date - timedelta(days=30)
            date_filter_sql = "AND completed_at >= CURRENT_DATE - INTERVAL '30 days'"
        elif time_period == "year":
            start_date = end_date - timedelta(days=365)
            date_filter_sql = "AND completed_at >= CURRENT_DATE - INTERVAL '1 year'"
        
        # Add time period context for AI
        time_context = f"Time filter: {time_period} ({date_filter_sql if date_filter_sql else 'no date filter'})"
        
        # Get relevant context from RAG
        context = getattr(self, 'knowledge_base', '') or ""
        
        # Generate SQL query and chart type
        analysis_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a manufacturing data analyst. Based on the user query, generate:
            1. A SQL query to extract the needed data
            2. The appropriate chart type
            3. A brief explanation
            
            CONTEXT FROM KNOWLEDGE BASE:
            {context}
            
            USER ID: {user_id}
            TIME PERIOD: {time_period}
            TIME FILTER SQL: {time_context}
            
            IMPORTANT GUIDELINES:
            - Use exact table names: work_orders, manufacturing_orders, users, work_centers, components
            - Use correct enum names: 'COMPLETED', 'PENDING', 'STARTED', 'PAUSED' for work orders
            - Manufacturing order statuses: 'PLANNED', 'IN_PROGRESS', 'DONE', 'CANCELED'
            - Handle NULL values with COALESCE() or IS NOT NULL checks
            - Use DATE() function for date grouping: DATE(completed_at)
            - Filter by assigned_user_id when showing personal work order data
            - Apply proper date filters: WHERE completed_at >= CURRENT_DATE - INTERVAL '30 days'
            - Use LEFT JOIN for optional relationships (work_center_id can be NULL)
            - PostgreSQL syntax: Use single quotes for strings, proper date functions
            - Chart types: bar, line, pie, scatter, histogram
            
            Return your response in this JSON format:
            {{
                "sql_query": "SELECT ...",
                "chart_type": "bar|line|pie|scatter|histogram",
                "explanation": "Brief explanation of what this shows"
            }}"""),
            ("human", "User query: {user_query}")
        ])
        
        try:
            self._ensure_llm_initialized()
            response = self.llm.invoke(
                analysis_prompt.format_messages(
                    context=context,
                    user_id=user_id,
                    time_period=time_period,
                    time_context=time_context,
                    user_query=user_query
                )
            )
            
            # Parse response
            response_text = response.content.strip()
            
            # Try to extract JSON from response
            if "{" in response_text and "}" in response_text:
                json_start = response_text.find("{")
                json_end = response_text.rfind("}") + 1
                json_str = response_text[json_start:json_end]
                
                try:
                    analysis = json.loads(json_str)
                except json.JSONDecodeError:
                    # Fallback analysis
                    analysis = self._fallback_analysis(user_query, user_id)
            else:
                analysis = self._fallback_analysis(user_query, user_id)
            
            # Execute SQL query
            data = self.query_database(analysis["sql_query"], user_id, start_date, end_date)
            
            # Generate chart
            chart_code = self.generate_chart_code(analysis["chart_type"], data, user_query)
            chart_json = self.execute_chart_code(chart_code, data)
            
            return {
                "success": True,
                "response": analysis["explanation"],
                "explanation": analysis["explanation"],
                "data": data,
                "chart_data": chart_json,
                "chart_json": chart_json,  # Keep for backwards compatibility
                "chart_type": analysis["chart_type"],
                "sql_query": analysis["sql_query"],
                "generated_code": chart_code
            }
            
        except Exception as e:
            print(f"Query processing error: {e}")
            return {
                "success": False,
                "error": str(e),
                "explanation": "Failed to process query"
            }
    
    def _fallback_analysis(self, user_query: str, user_id: int) -> Dict[str, str]:
        """Fallback analysis when AI parsing fails"""
        query_lower = user_query.lower()
        
        if "productivity" in query_lower or "work order" in query_lower:
            return {
                "sql_query": f"""
                SELECT DATE(completed_at) as date, COUNT(*) as completed_orders
                FROM work_orders 
                WHERE status = 'COMPLETED' AND completed_at IS NOT NULL
                AND completed_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE(completed_at) 
                ORDER BY date DESC 
                LIMIT 30
                """,
                "chart_type": "line",
                "explanation": "Shows daily work order completion trend for the last 30 days"
            }
        elif "cost" in query_lower:
            return {
                "sql_query": f"""
                SELECT wo.name, wo.actual_cost, wo.estimated_cost, wc.name as work_center
                FROM work_orders wo
                LEFT JOIN work_centers wc ON wo.work_center_id = wc.id
                WHERE wo.actual_cost > 0 OR wo.estimated_cost > 0
                ORDER BY COALESCE(wo.actual_cost, wo.estimated_cost) DESC 
                LIMIT 20
                """,
                "chart_type": "bar",
                "explanation": "Shows work orders by cost (actual or estimated)"
            }
        elif "manufacturing" in query_lower or "orders" in query_lower:
            return {
                "sql_query": f"""
                SELECT 
                    mo.product_name, 
                    mo.quantity,
                    mo.status,
                    mo.deadline
                FROM manufacturing_orders mo
                ORDER BY mo.created_at DESC
                LIMIT 20
                """,
                "chart_type": "bar",
                "explanation": "Shows recent manufacturing orders by product and quantity"
            }
        else:
            return {
                "sql_query": f"""
                SELECT status, COUNT(*) as count 
                FROM work_orders 
                GROUP BY status
                """,
                "chart_type": "pie",
                "explanation": "Shows distribution of all work order statuses"
            }

# Global instance
ai_report_generator = AIReportGenerator()