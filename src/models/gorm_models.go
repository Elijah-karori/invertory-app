// Package models defines GORM database models for ONT Network & Equipment Inventory System
package models

import (
	"time"
)

type UserRole string

const (
	RoleAdmin           UserRole = "Admin"
	RoleStoreManager    UserRole = "Store Manager"
	RoleFieldTechnician UserRole = "Field Technician"
	RoleSupport         UserRole = "Support"
)

type AssetStatus string

const (
	StatusInStock        AssetStatus = "In Stock"
	StatusIssuedOut      AssetStatus = "Issued / Out"
	StatusUnderRepair    AssetStatus = "Under Repair"
	StatusDecommissioned AssetStatus = "Decommissioned"
)

// User represents system staff and operators with RBAC
type User struct {
	ID         string    `gorm:"primaryKey;size:64" json:"id"`
	Name       string    `gorm:"size:128;not null" json:"name"`
	Email      string    `gorm:"size:128;uniqueIndex;not null" json:"email"`
	Role       UserRole  `gorm:"size:32;not null" json:"role"`
	Department string    `gorm:"size:64;default:'Operations'" json:"department"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (User) TableName() string {
	return "users"
}

// ItemCatalog represents telecom equipment specifications & bulk inventory
type ItemCatalog struct {
	SKU            string    `gorm:"primaryKey;size:64" json:"sku"`
	Category       string    `gorm:"size:64;not null" json:"category"`
	Model          string    `gorm:"size:128;not null" json:"model"`
	Manufacturer   string    `gorm:"size:64;default:'Generic'" json:"manufacturer"`
	UnitCost       float64   `gorm:"type:numeric(12,2);default:0.00" json:"unit_cost"`
	ReorderLevel   int       `gorm:"default:3" json:"reorder_level"`
	IsSerialized   bool      `gorm:"default:false" json:"is_serialized"`
	Specifications string    `gorm:"type:text" json:"specifications"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (ItemCatalog) TableName() string {
	return "item_catalog"
}

// SerializedUnit represents tracked physical devices by Serial Number & MAC Address
type SerializedUnit struct {
	AssetID            string      `gorm:"primaryKey;size:64" json:"asset_id"`
	SKU                string      `gorm:"size:64;not null;index" json:"sku"`
	Category           string      `gorm:"size:64;not null" json:"category"`
	Model              string      `gorm:"size:128;not null" json:"model"`
	SerialNumber       string      `gorm:"size:128;uniqueIndex;not null" json:"serial_number"`
	MACAddress         string      `gorm:"size:64" json:"mac_address"`
	Status             AssetStatus `gorm:"size:32;default:'In Stock';index" json:"status"`
	Condition          string      `gorm:"size:32;default:'New'" json:"condition"`
	CurrentLocation    string      `gorm:"size:128;default:'Main Store'" json:"current_location"`
	CurrentCustodianID *string     `gorm:"size:64;index" json:"current_custodian_id"`
	Notes              string      `gorm:"type:text" json:"notes"`
	CreatedAt          time.Time   `json:"created_at"`
	UpdatedAt          time.Time   `json:"updated_at"`

	ItemCatalog ItemCatalog `gorm:"foreignKey:SKU;references:SKU" json:"catalog,omitempty"`
	Custodian   *User       `gorm:"foreignKey:CurrentCustodianID;references:ID" json:"custodian,omitempty"`
}

func (SerializedUnit) TableName() string {
	return "serialized_units"
}

// TransactionLedger is the immutable audit log for all stock movements
type TransactionLedger struct {
	ID            string    `gorm:"primaryKey;size:64" json:"id"`
	Date          time.Time `gorm:"type:date;default:CURRENT_DATE;index" json:"date"`
	Direction     string    `gorm:"size:16;not null" json:"direction"` // 'Stock In' or 'Stock Out'
	SKU           string    `gorm:"size:64;not null;index" json:"sku"`
	AssetID       *string   `gorm:"size:64;index" json:"asset_id"`
	Quantity      int       `gorm:"not null" json:"quantity"`
	UnitCost      float64   `gorm:"type:numeric(12,2);default:0.00" json:"unit_cost"`
	TotalCost     float64   `gorm:"type:numeric(14,2);default:0.00" json:"total_cost"`
	PerformedByID string    `gorm:"size:64;not null" json:"performed_by_id"`
	CostType      string    `gorm:"size:64;not null" json:"cost_type"`
	TaskID        *string   `gorm:"size:64;index" json:"task_id"`
	Site          string    `gorm:"size:128" json:"site"`
	Notes         string    `gorm:"type:text" json:"notes"`
	CreatedAt     time.Time `json:"created_at"`

	CatalogItem ItemCatalog     `gorm:"foreignKey:SKU;references:SKU" json:"catalog_item,omitempty"`
	Asset       *SerializedUnit `gorm:"foreignKey:AssetID;references:AssetID" json:"asset,omitempty"`
	PerformedBy User            `gorm:"foreignKey:PerformedByID;references:ID" json:"performed_by,omitempty"`
}

func (TransactionLedger) TableName() string {
	return "transaction_ledger"
}

// Task represents work orders, fiber installations, and maintenance
type Task struct {
	ID           string     `gorm:"primaryKey;size:64" json:"id"`
	Title        string     `gorm:"size:255;not null" json:"title"`
	AssigneeID   *string    `gorm:"size:64;index" json:"assignee_id"`
	Priority     string     `gorm:"size:16;default:'Normal'" json:"priority"`
	Status       string     `gorm:"size:32;default:'Assigned';index" json:"status"`
	RequiredSKU  *string    `gorm:"size:64" json:"required_sku"`
	RequiredQty  int        `gorm:"default:0" json:"required_qty"`
	Site         string     `gorm:"size:128" json:"site"`
	Reference    string     `gorm:"size:128" json:"reference"`
	Notes        string     `gorm:"type:text" json:"notes"`
	CreatedByID  *string    `gorm:"size:64" json:"created_by_id"`
	StockReadyAt *time.Time `json:"stock_ready_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`

	Assignee *User `gorm:"foreignKey:AssigneeID;references:ID" json:"assignee,omitempty"`
}

func (Task) TableName() string {
	return "tasks"
}

// CustomerIssue represents customer support tickets and equipment swaps
type CustomerIssue struct {
	TicketID       string    `gorm:"primaryKey;size:64" json:"ticket_id"`
	CustomerName   string    `gorm:"size:128;not null" json:"customer_name"`
	AccountNumber  string    `gorm:"size:64" json:"account_number"`
	IssueCategory  string    `gorm:"size:64;not null" json:"issue_category"`
	AssignedTechID *string   `gorm:"size:64;index" json:"assigned_tech_id"`
	OldDeviceSN    string    `gorm:"size:128" json:"old_device_sn"`
	NewDeviceSN    string    `gorm:"size:128" json:"new_device_sn"`
	Status         string    `gorm:"size:32;default:'Open'" json:"status"`
	LoggedByID     *string   `gorm:"size:64" json:"logged_by_id"`
	Notes          string    `gorm:"type:text" json:"notes"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	AssignedTech *User `gorm:"foreignKey:AssignedTechID;references:ID" json:"assigned_tech,omitempty"`
}

func (CustomerIssue) TableName() string {
	return "customer_issues"
}
