-- ============================================================================
-- ONT Network & Equipment Inventory System - Seed Data Migration
-- Migration: 002_seed_isp_data.sql
-- ============================================================================

-- 1. Seed Users (ISP Roles: Admin, Store Manager, Field Technician, Support)
INSERT INTO users (id, name, email, role, department) VALUES
('USR-001', 'Sarah Jenkins', 'admin@ontnetwork.isp', 'Admin', 'Network Operations Center'),
('USR-002', 'Otieno Moses', 'otienomoses998@gmail.com', 'Store Manager', 'Logistics & Warehouse'),
('USR-003', 'Dennis Kiprop', 'dennis.tech@ontnetwork.isp', 'Field Technician', 'Field Engineering'),
('USR-004', 'Faith Wambui', 'faith.tech@ontnetwork.isp', 'Field Technician', 'FTTH Installations'),
('USR-005', 'Kevin Mutua', 'support@ontnetwork.isp', 'Support', 'Customer Experience')
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Item Catalog (Derived directly from ONT Network Inventory Register)
INSERT INTO item_catalog (sku, category, model, manufacturer, unit_cost, reorder_level, is_serialized, specifications) VALUES
('SKU-ONT-HG8546M', 'XPON/ONT', 'EchoLife HG8546M', 'Huawei', 3800.00, 5, true, '1GE + 3FE + 1POTS + 1USB + 2.4G Wi-Fi GPON Terminal'),
('SKU-ONT-HG8145V5', 'XPON/ONT', 'EchoLife HG8145V5', 'Huawei', 4500.00, 3, true, 'Routing-type ONT with dual-band Wi-Fi (2.4G/5G) and 4 GE ports'),
('SKU-ONT-EG8145V5', 'XPON/ONT', 'EG8145V5', 'Huawei', 4800.00, 3, true, 'Intelligent routing-type ONT, Gigabit dual-band AC Wi-Fi'),
('SKU-ONT-HG8145V6', 'XPON/ONT', 'OptiXstar HG8145V6', 'Huawei', 6200.00, 2, true, 'Wi-Fi 6 GPON terminal, 4*GE + 1*POTS + 1*USB + 2.4G&5G Wi-Fi 6'),
('SKU-ONT-HG8245H', 'XPON/ONT', 'EchoLife HG8245H', 'Huawei', 4100.00, 3, true, '4GE + 2POTS + 1USB + Wi-Fi GPON ONT'),
('SKU-ONT-XPON', 'XPON/ONT', 'XPON Dual-Mode Router', 'Generic', 3200.00, 6, true, 'Dual-mode EPON/GPON ONU with 1GE+1FE and Wi-Fi'),
('SKU-ONT-GPON', 'XPON/ONT', 'GPON Router Standard', 'Generic', 3100.00, 5, true, 'Standard GPON Optical Network Terminal with SC/UPC interface'),
('SKU-ONT-AN5506', 'XPON/ONT', 'AN5506-04-FS', 'FiberHome', 4300.00, 2, true, 'Fiberhome GPON optical unit, 4 GE ports, Wi-Fi'),
('SKU-RTR-TLWR842N', 'Wireless Router', 'TL-WR842N 300Mbps', 'TP-Link', 2100.00, 4, true, '300Mbps Multi-Function Wireless N Router'),
('SKU-RTR-ZLTX25', 'Wireless Router', 'ZLT X25 Indoor CPE', 'Tozed Kangwei', 5200.00, 2, true, 'Indoor LTE/Fiber dual-WAN Wireless Router'),
('SKU-NET-AR611VW', 'Enterprise Router', 'NetEngine AR611VW', 'Huawei', 18500.00, 2, true, 'Enterprise branch router, 1*GE Combo WAN, 4*GE LAN, Wi-Fi'),
('SKU-FAT-16P', 'FAT Box', '16-Port Fiber Access Terminal', 'OpticTech', 1900.00, 2, true, 'Outdoor IP65 16-core Fiber Distribution Box with PLC tray'),
('SKU-SPL-1X8', 'Passive Optics', '1x8 Optical PLC Splitter', 'Corning', 450.00, 5, false, 'Mini steel tube PLC splitter SC/UPC connectors'),
('SKU-ATB-100', 'Passive Optics', 'Access Terminal Box 2-Port', 'Generic', 180.00, 8, false, 'Indoor Wall-mount Rosette Terminal Box 2 Core'),
('SKU-ADP-BOX', 'Passive Optics', 'Fiber Adapter Box SC/UPC', 'Generic', 95.00, 10, false, 'Simplex SC/UPC blue female coupler adapter'),
('SKU-PWR-ADP', 'Accessories', '12V 1.5A Power Adapter', 'Huntkey', 350.00, 10, false, 'Universal DC power supply for ONTs & Routers'),
('SKU-CBL-DROP', 'Fiber Cable', '2-Core FTTH Drop Cable Roll 2km', 'CommScope', 14500.00, 2, false, 'Outdoor G.657A1 self-supporting aerial drop cable 2km drum'),
('SKU-CBL-OUTDOOR', 'Fiber Cable', 'Outdoor Fiber Cable Roll 1km', 'CommScope', 9800.00, 2, false, 'Armored outdoor single-mode fiber roll 1km'),
('SKU-CBL-OUTDOOR-ETHER', 'Copper Cable', 'Outdoor Shielded Cat6 Cable 305m', 'D-Link', 11200.00, 2, false, 'UV-resistant weatherproof Cat6 FTP cable drum')
ON CONFLICT (sku) DO UPDATE SET
  category = EXCLUDED.category,
  model = EXCLUDED.model,
  unit_cost = EXCLUDED.unit_cost,
  reorder_level = EXCLUDED.reorder_level;

-- 3. Seed Serialized Units (Optical Network Terminals, Routers, OLT Devices)
INSERT INTO serialized_units (asset_id, sku, category, model, serial_number, mac_address, status, condition, current_location, current_custodian_id, notes) VALUES
('INV-ONT-0001', 'SKU-ONT-HG8546M', 'XPON/ONT', 'EchoLife HG8546M', '4857544321A89F01', '48:57:02:1A:89:F1', 'In Stock', 'New', 'Main Store - Rack A1', NULL, 'Tested clean PON link; optical power -18.2 dBm.'),
('INV-ONT-0002', 'SKU-ONT-HG8546M', 'XPON/ONT', 'EchoLife HG8546M', '4857544321A89F02', '48:57:02:1A:89:F2', 'In Stock', 'New', 'Main Store - Rack A1', NULL, 'Provisioned standard ISP template v4.1.'),
('INV-ONT-0003', 'SKU-ONT-HG8546M', 'XPON/ONT', 'EchoLife HG8546M', '4857544321A89F03', '48:57:02:1A:89:F3', 'Issued / Out', 'Good', 'Customer Site - Westlands Plot 14', 'USR-003', 'Issued for installation TASK-0001.'),
('INV-ONT-0004', 'SKU-ONT-HG8145V5', 'XPON/ONT', 'EchoLife HG8145V5', '4857544378B44122', 'A4:6C:2A:44:12:01', 'In Stock', 'New', 'Main Store - Rack A2', NULL, 'Dual-band Wi-Fi 5 ONT, firmware up to date.'),
('INV-ONT-0005', 'SKU-ONT-HG8145V5', 'XPON/ONT', 'EchoLife HG8145V5', '4857544378B44123', 'A4:6C:2A:44:12:02', 'Under Repair', 'Faulty', 'Service Bench 2', NULL, 'Swapped from TKT-4491: Customer reported continuous red LOS light.'),
('INV-ONT-0006', 'SKU-ONT-EG8145V5', 'XPON/ONT', 'EG8145V5', '4857544399CC8100', '00:E0:4C:99:CC:81', 'In Stock', 'New', 'Main Store - High Priority Shelf', NULL, 'Enterprise client ready.'),
('INV-ONT-0007', 'SKU-ONT-HG8145V6', 'XPON/ONT', 'OptiXstar HG8145V6', '4857544366DD1044', '20:08:ED:66:DD:10', 'In Stock', 'New', 'Main Store - Secure Locker', NULL, 'Wi-Fi 6 gigabit terminal for premium package subscribers.'),
('INV-ONT-0008', 'SKU-ONT-HG8245H', 'XPON/ONT', 'EchoLife HG8245H', '4857544300EE5512', '70:AF:6A:00:EE:55', 'In Stock', 'Good', 'Main Store - Rack B1', NULL, 'Bench verified, factory reset.'),
('INV-ONT-0009', 'SKU-ONT-AN5506', 'XPON/ONT', 'AN5506-04-FS', 'FHTT44919022AA11', '00:0B:82:90:22:AA', 'In Stock', 'New', 'Main Store - Rack B2', NULL, 'Compatible with FiberHome OLT Line Cards.'),
('INV-RTR-0001', 'SKU-RTR-TLWR842N', 'Wireless Router', 'TL-WR842N 300Mbps', 'TP21098420011944', '50:C7:BF:09:84:20', 'In Stock', 'New', 'Main Store - Router Bin 4', NULL, 'Configured for PPPoE / DHCP failover.'),
('INV-RTR-0002', 'SKU-RTR-ZLTX25', 'Wireless Router', 'ZLT X25 Indoor CPE', 'ZLT8894211029411', '9C:3D:CF:88:94:21', 'Issued / Out', 'Good', 'Kilimani Tower A - Unit 4B', 'USR-004', 'Issued for backup LTE connection.'),
('INV-NET-0001', 'SKU-NET-AR611VW', 'Enterprise Router', 'NetEngine AR611VW', 'AR611VW202409001', '00:1E:10:81:44:90', 'In Stock', 'New', 'Secure Vault B', NULL, 'Includes IPsec VPN and AC license.'),
('INV-FAT-0001', 'SKU-FAT-16P', 'FAT Box', '16-Port Fiber Access Terminal', 'FAT16P-2024-NBO-01', 'N/A', 'In Stock', 'New', 'Outside Yard Storage C', NULL, 'Complete with 16 SC/UPC pigtails and rubber grommets.')
ON CONFLICT (asset_id) DO NOTHING;

-- 4. Seed Tasks
INSERT INTO tasks (id, title, assignee_id, priority, status, required_sku, required_qty, site, reference, notes, created_by_id) VALUES
('TASK-0001', 'New FTTH Installation - Plot 14 Westlands', 'USR-003', 'High', 'In Progress', 'SKU-ONT-HG8546M', 1, 'Westlands Plot 14', 'WO-9982', 'Customer subscribed to 50Mbps Fiber Pro. Issued INV-ONT-0003.', 'USR-002'),
('TASK-0002', 'Faulty ONT Swap at Parklands Court #12', 'USR-003', 'Critical', 'Awaiting Stock', 'SKU-ONT-HG8145V5', 1, 'Parklands Court #12', 'TKT-4491', 'Intermittent optical disconnects. Customer VIP SLA.', 'USR-002'),
('TASK-0003', 'FAT Expansion & Drop Splicing - Kilimani', 'USR-004', 'Normal', 'Ready', 'SKU-SPL-1X8', 2, 'Kilimani Junction FAT-04', 'MAINT-104', 'Splice two additional 1x8 splitters to accommodate 16 new subscribers.', 'USR-001'),
('TASK-0004', 'SME Branch Setup - NetEngine Router Config', 'USR-003', 'Normal', 'Assigned', 'SKU-NET-AR611VW', 1, 'Upperhill Financial Hub', 'CORP-882', 'Deliver and install enterprise gateway router.', 'USR-001')
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Customer Issues / Tickets
INSERT INTO customer_issues (ticket_id, customer_name, account_number, issue_category, assigned_tech_id, old_device_sn, new_device_sn, status, logged_by_id, notes) VALUES
('TKT-4491', 'Amina Abdalla', 'ACC-88219', 'Faulty ONT / Router', 'USR-003', '4857544378B44123', '4857544321A89F01', 'In Progress', 'USR-005', 'Replaced faulty HG8145V5 showing continuous LOS alarm with fresh HG8546M.'),
('TKT-4492', 'Apex Logistics Ltd', 'ACC-10492', 'No Optical Link', 'USR-004', 'N/A', 'N/A', 'Open', 'USR-005', 'Aerial drop cable severed during municipal road excavation. Splicing crew dispatched.'),
('TKT-4493', 'Dr. David Mwangi', 'ACC-33120', 'Wi-Fi / Password Reset', 'USR-005', 'N/A', 'N/A', 'Resolved', 'USR-005', 'Assisted customer over the phone with SSID 5GHz band reconfiguration.')
ON CONFLICT (ticket_id) DO NOTHING;

-- 6. Seed Initial Immutable Audit Ledger
INSERT INTO transaction_ledger (id, date, direction, sku, asset_id, quantity, unit_cost, total_cost, performed_by_id, cost_type, task_id, site, notes) VALUES
('TXN-2026-0001', '2026-09-20', 'Stock In', 'SKU-ONT-HG8546M', 'INV-ONT-0001', 1, 3800.00, 3800.00, 'USR-001', 'Procurement / Stock In', NULL, 'Main Store', 'Batch #PO-9844 received from distributor.'),
('TXN-2026-0002', '2026-09-20', 'Stock In', 'SKU-ONT-HG8546M', 'INV-ONT-0002', 1, 3800.00, 3800.00, 'USR-001', 'Procurement / Stock In', NULL, 'Main Store', 'Batch #PO-9844 received from distributor.'),
('TXN-2026-0003', '2026-09-21', 'Stock In', 'SKU-SPL-1X8', NULL, 10, 450.00, 4500.00, 'USR-002', 'Procurement / Stock In', NULL, 'Main Store', 'Bulk optical splitters receipt.'),
('TXN-2026-0004', '2026-09-22', 'Stock Out', 'SKU-ONT-HG8546M', 'INV-ONT-0003', 1, 3800.00, 3800.00, 'USR-002', 'Installation', 'TASK-0001', 'Westlands Plot 14', 'Issued to tech Dennis Kiprop for installation.'),
('TXN-2026-0005', '2026-09-23', 'Stock In', 'SKU-CBL-DROP', NULL, 2, 14500.00, 29000.00, 'USR-001', 'Procurement / Stock In', NULL, 'Central Yard', '2 drums of 2km drop cable.')
ON CONFLICT (id) DO NOTHING;
