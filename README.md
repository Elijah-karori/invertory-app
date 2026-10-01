# Telecom Warehouse & Operations Management System

A production-grade, multi-page web application designed for telecommunication service providers to manage inventory, network operations center (NOC) dispatches, field installations, item catalogs, and admin user governance.

---

## 🚀 Key Features

* **Multi-Page Navigation & Routing**: Built using `react-router-dom` v7 with a structured, collapsible sidebar for seamless access across system domains:
  * **Overview & NOC**: Live Operational Dashboard, Network Operations Center (NOC) Dispatches, Optical Stream Live Camera Monitor.
  * **Inventory & Warehouse**: Stock Summary & Warehouses, Item Catalog Management, Stock Movements & Barcode Scanner, Purchase Orders & Supplier Requisitions.
  * **Field & Customer Operations**: Customer Installs & Field Audits, Serial Number History Traceability.
  * **Admin Governance**: User Management & RBAC Roles, Audit Logs & System Activity.
* **Item Catalog Management**: Full CRUD interface to register hardware items, automatically generate formatted SKUs (`SKU-CAT-MODEL-XXX`), and maintain descriptions, categories, and base prices.
* **Serial Number & Asset Tracking**: Complete lifecycle tracking for ONTs, Routers, Fiber Cables, and Splitters from receiving, staging, field installation, to warranty returns.
* **Integrated QR / Barcode Scanner**:
  * Real-time webcam optical stream scanning.
  * **Image File Extraction**: Direct file upload support to extract QR/Barcode values from photos using canvas decoding (`jsQR`).
* **Admin User Management & Role-Based Access Control (RBAC)**:
  * Secure route guards (`RoleGuard`) restricting administrative functions.
  * Create new staff user accounts with specific roles (`Admin`, `Warehouse_Manager`, `NOC_Operator`, `Field_Technician`) and departments.
  * Dynamically update user roles and permissions.
* **Theme Customization**: Dark Mode and Light Mode support with persistent state stored in `localStorage`.
* **SQLite Backend with Express**: Robust REST API powered by SQLite (`better-sqlite3`) for fast local persistence, automated table migrations, and transactional integrity.

---

## 🛠️ Tech Stack

* **Frontend Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Build Tool**: [Vite 6](https://vitejs.dev/)
* **Routing**: [React Router DOM v7](https://reactrouter.com/)
* **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide React Icons](https://lucide.dev/)
* **Barcode & QR Processing**: `jsQR` & Canvas API
* **Backend Runtime**: [Node.js](https://nodejs.org/) / [Bun](https://bun.sh/) with [Express.js](https://expressjs.com/)
* **Database**: [SQLite3](https://www.sqlite.org/) via `better-sqlite3`

---

## 📋 System Guidelines

1. **Role-Based Permissions**:
   * **Admin**: Unrestricted access to User Management, Catalog Creation, System Configuration, and Audit Logs.
   * **Warehouse Manager**: Full access to Stock Summaries, Receiving, Stock Movements, PO Creation, and Serial Number updates.
   * **NOC Operator**: Access to NOC Dispatch creation, network fault monitoring, and field updates.
   * **Field Technician**: Access to Field Install checkouts, customer site assignments, and device QR scanning.
2. **Serial Number Formatting**:
   * Optical Network Terminals (ONTs) and Routers require unique serial numbers (e.g., `4857544321A89F01`).
3. **Data Integrity**:
   * Stock transfers automatically recalculate available stock across source and target warehouses inside atomic database transactions.

---

## 💻 Local Development Setup

### Prerequisites
* **Node.js** (v18+ recommended) or **Bun** (v1.0+)
* **Git**

### Installation Steps

1. **Clone Repository**:
   ```bash
   git clone <repository-url>
   cd telecom-warehouse-system
   ```

2. **Install Dependencies**:
   ```bash
   # Using Bun
   bun install

   # Or using npm
   npm install
   ```

3. **Start Development Server**:
   ```bash
   # Using Bun
   bun run dev

   # Or using npm
   npm run dev
   ```
   * Open `http://localhost:3000` in your web browser.

---

## 🐧 Production Deployment Guide - Linux (Ubuntu / Debian / RHEL)

### 1. System Requirements & Preparation
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential sqlite3 nginx
```

### 2. Install Node.js or Bun
```bash
# Installing Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# (Optional) Installing Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

### 3. Deploy Code & Build Application
```bash
cd /var/www
sudo git clone <repository-url> telecom-app
cd telecom-app

# Install dependencies and build frontend assets
sudo npm install
sudo npm run build
```

### 4. Configure Systemd Service
Create a systemd service file to keep the backend API running continuously:
```bash
sudo nano /etc/systemd/system/telecom-app.service
```

Add the following configuration:
```ini
[Unit]
Description=Telecom Warehouse Express API Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/telecom-app
ExecStart=/usr/bin/node /var/www/telecom-app/server.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production PORT=3000

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable telecom-app
sudo systemctl start telecom-app
sudo systemctl status telecom-app
```

### 5. Reverse Proxy with Nginx
Create an Nginx server block:
```bash
sudo nano /etc/nginx/sites-available/telecom-app
```

Add the configuration:
```nginx
server {
    listen 80;
    server_name your-domain-or-ip.com;

    root /var/www/telecom-app/dist;
    index index.html;

    # Serve static frontend files with React Router fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to Express server
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/telecom-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🪟 Production Deployment Guide - Windows (Windows Server / Windows 10/11)

### Option A: Running as a Windows Service (Using NSSM)

#### 1. Install Dependencies
* Download and install **Node.js LTS** from [nodejs.org](https://nodejs.org/).
* Download **NSSM (Non-Sucking Service Manager)** from [nssm.cc](https://nssm.cc/).

#### 2. Build the Application
Open PowerShell as Administrator:
```powershell
cd C:\Services\telecom-app
npm install
npm run build
```

#### 3. Install App as Windows Service using NSSM
```powershell
# Navigate to directory containing nssm.exe
cd C:\PathTo\nssm\win64

# Install service
.\nssm.exe install TelecomWarehouseService "C:\Program Files\nodejs\node.exe" "C:\Services\telecom-app\server.ts"

# Set working directory & environment variables
.\nssm.exe set TelecomWarehouseService AppDirectory "C:\Services\telecom-app"
.\nssm.exe set TelecomWarehouseService AppEnvironmentExtra NODE_ENV=production PORT=3000

# Start service
.\nssm.exe start TelecomWarehouseService
```

---

### Option B: IIS (Internet Information Services) Reverse Proxy

#### 1. Prerequisites
* Install IIS via Windows Features (`Web Server (IIS)`).
* Install **URL Rewrite Module** and **Application Request Routing (ARR)** for IIS.

#### 2. Configure Web.config in `C:\Services\telecom-app\dist`
Create a `web.config` file inside your build distribution folder:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="API Reverse Proxy" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://localhost:3000/api/{R:1}" />
                </rule>
                <rule name="React SPA Routing" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
```

#### 3. Create IIS Website
1. Open **IIS Manager**.
2. Right-click **Sites** -> **Add Website**.
3. Name: `TelecomWarehouse`.
4. Physical Path: `C:\Services\telecom-app\dist`.
5. Port: `80` (or custom port).
6. Click **OK**.

---

## 📄 License
This project is proprietary software for internal telecom logistics and network operations management.
