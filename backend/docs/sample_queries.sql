-- Sample PostgreSQL queries for your manufacturing database
-- Connect with: psql -h localhost -p 5432 -U postgres -d manufacturing_system_db

-- Show all users
SELECT id, email, first_name, last_name, role, department 
FROM users 
ORDER BY id;

-- Show manufacturing orders with status
SELECT id, product_name, quantity, status, priority, 
       TO_CHAR(deadline, 'YYYY-MM-DD') as deadline
FROM manufacturing_orders 
ORDER BY created_at DESC;

-- Show work orders with assigned users
SELECT wo.id, wo.name, wo.status, 
       COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned') as assigned_to,
       wc.name as work_center
FROM work_orders wo
LEFT JOIN users u ON wo.assigned_user_id = u.id
LEFT JOIN work_centers wc ON wo.work_center_id = wc.id
ORDER BY wo.id;

-- Show inventory levels
SELECT name, quantity_on_hand, unit_cost, supplier,
       CASE 
           WHEN quantity_on_hand <= reorder_level THEN 'LOW STOCK ⚠️'
           ELSE 'OK ✅'
       END as stock_status
FROM components
ORDER BY quantity_on_hand;

-- Show recent stock movements
SELECT sm.created_at::date as date, 
       c.name as component, 
       sm.movement_type, 
       sm.quantity, 
       sm.reference
FROM stock_movements sm
JOIN components c ON sm.component_id = c.id
ORDER BY sm.created_at DESC
LIMIT 10;