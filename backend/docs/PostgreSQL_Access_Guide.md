# PostgreSQL Database Access Guide

## 🗄️ **Your Database Connection Details**
- **Host**: localhost
- **Port**: 5432
- **Database**: manufacturing_system_db
- **Username**: postgres  
- **Password**: password

---

## **Method 1: psql Command Line (Terminal)**

### Connect to Database:
```powershell
psql -h localhost -p 5432 -U postgres -d manufacturing_system_db
```

### Alternative connection (if above doesn't work):
```powershell
psql postgresql://postgres:password@localhost:5432/manufacturing_system_db
```

### Common psql Commands:
```sql
-- List all databases
\l

-- List all tables
\dt

-- Describe table structure
\d table_name

-- Show table data
SELECT * FROM users LIMIT 10;

-- Show work orders with user names
SELECT wo.id, wo.name, wo.status, u.first_name, u.last_name 
FROM work_orders wo 
LEFT JOIN users u ON wo.assigned_user_id = u.id;

-- Show manufacturing orders with progress
SELECT id, product_name, quantity, status, priority, deadline 
FROM manufacturing_orders;

-- Show components with stock levels
SELECT name, quantity_on_hand, unit_cost, supplier, reorder_level 
FROM components 
ORDER BY quantity_on_hand;

-- Exit psql
\q
```

---

## **Method 2: pgAdmin (Web Interface)**

### Install pgAdmin:
1. Download from: https://www.pgadmin.org/download/
2. Or install via package manager:
   ```powershell
   winget install PostgreSQL.pgAdmin
   ```

### Access pgAdmin:
1. Open pgAdmin (usually at http://localhost:5050)
2. Add New Server:
   - **Name**: Manufacturing System
   - **Host**: localhost
   - **Port**: 5432
   - **Database**: manufacturing_system_db
   - **Username**: postgres
   - **Password**: password

---

## **Method 3: VS Code Extensions**

### Recommended Extensions:
1. **PostgreSQL** by Chris Kolkman
2. **Database Client** by Weijan Chen
3. **SQLTools** by Matheus Teixeira

### Install Database Client Extension:
```
Ctrl+Shift+X → Search "Database Client" → Install
```

### Connection Setup:
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Database Client: Add Connection"
3. Select PostgreSQL
4. Enter connection details:
   - **Host**: localhost
   - **Port**: 5432
   - **Database**: manufacturing_system_db
   - **Username**: postgres
   - **Password**: password

---

## **Method 4: DBeaver (Free GUI Tool)**

### Install DBeaver:
```powershell
winget install dbeaver.dbeaver
```

### Or download from: https://dbeaver.io/

### Connection Setup:
1. New Database Connection → PostgreSQL
2. Enter your connection details
3. Test Connection → Finish

---

## **Quick SQL Queries for Your Database**

### View All Tables:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Show Current Manufacturing Status:
```sql
SELECT 
    mo.id,
    mo.product_name,
    mo.quantity,
    mo.status,
    mo.priority,
    COUNT(wo.id) as total_work_orders,
    COUNT(CASE WHEN wo.status = 'COMPLETED' THEN 1 END) as completed_work_orders
FROM manufacturing_orders mo
LEFT JOIN work_orders wo ON mo.id = wo.manufacturing_order_id
GROUP BY mo.id, mo.product_name, mo.quantity, mo.status, mo.priority
ORDER BY mo.created_at DESC;
```

### Show Inventory Levels:
```sql
SELECT 
    name,
    quantity_on_hand,
    unit_cost,
    supplier,
    reorder_level,
    CASE 
        WHEN quantity_on_hand <= reorder_level THEN 'LOW STOCK'
        ELSE 'OK'
    END as stock_status
FROM components
ORDER BY quantity_on_hand;
```

### Show Work Center Utilization:
```sql
SELECT 
    wc.name,
    wc.cost_per_hour,
    wc.capacity,
    COUNT(wo.id) as assigned_orders,
    COUNT(CASE WHEN wo.status IN ('STARTED', 'IN_PROGRESS') THEN 1 END) as active_orders
FROM work_centers wc
LEFT JOIN work_orders wo ON wc.id = wo.work_center_id
GROUP BY wc.id, wc.name, wc.cost_per_hour, wc.capacity
ORDER BY active_orders DESC;
```

---

## **Backup and Restore Commands**

### Create Backup:
```powershell
pg_dump -h localhost -p 5432 -U postgres manufacturing_system_db > backup.sql
```

### Restore from Backup:
```powershell
psql -h localhost -p 5432 -U postgres manufacturing_system_db < backup.sql
```

---

## **Security Notes**
- Change default password in production
- Use environment variables for credentials
- Set up proper user roles and permissions
- Enable SSL connections for remote access