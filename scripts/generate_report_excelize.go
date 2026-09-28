// ============================================================================
// ONT Network & Equipment Inventory System - Excel Report Generator (Go + Excelize)
// Package: main
// Usage: go run scripts/generate_report_excelize.go
// ============================================================================

package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
	"github.com/xuri/excelize/v2"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/ont_inventory?sslmode=disable"
	}

	fmt.Println("Connecting to PostgreSQL database...")
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			fmt.Println(err)
		}
	}()

	// Create Sheets
	f.SetSheetName("Sheet1", "Stock Summary")
	f.NewSheet("Serialized Inventory")
	f.NewSheet("Audit Ledger")
	f.NewSheet("Field Tasks")
	f.NewSheet("Customer Issues")

	// Set Headers for Stock Summary
	summaryHeaders := []string{"SKU", "Item / Model", "Category", "Is Serialized", "Total In", "Total Out", "Net Remaining", "Status", "Unit Cost", "Stock Value"}
	for colIdx, h := range summaryHeaders {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		f.SetCellValue("Stock Summary", cell, h)
	}

	// Fetch Summary Data
	rows, err := db.Query(`
		SELECT 
			c.sku, c.model, c.category, c.is_serialized,
			COALESCE(SUM(CASE WHEN t.direction = 'Stock In' THEN t.quantity ELSE 0 END), 0) AS total_in,
			COALESCE(SUM(CASE WHEN t.direction = 'Stock Out' THEN t.quantity ELSE 0 END), 0) AS total_out,
			c.unit_cost
		FROM item_catalog c
		LEFT JOIN transaction_ledger t ON c.sku = t.sku
		GROUP BY c.sku, c.model, c.category, c.is_serialized, c.unit_cost
		ORDER BY c.sku ASC
	`)
	if err == nil {
		defer rows.Close()
		rowIdx := 2
		for rows.Next() {
			var sku, model, category string
			var isSerialized bool
			var totalIn, totalOut int
			var unitCost float64

			if err := rows.Scan(&sku, &model, &category, &isSerialized, &totalIn, &totalOut, &unitCost); err == nil {
				net := totalIn - totalOut
				status := "In Stock"
				if net <= 0 {
					status = "Out of Stock"
				} else if net <= 3 {
					status = "Low Stock"
				}
				stockValue := float64(net) * unitCost
				if stockValue < 0 {
					stockValue = 0
				}

				f.SetCellValue("Stock Summary", fmt.Sprintf("A%d", rowIdx), sku)
				f.SetCellValue("Stock Summary", fmt.Sprintf("B%d", rowIdx), model)
				f.SetCellValue("Stock Summary", fmt.Sprintf("C%d", rowIdx), category)
				f.SetCellValue("Stock Summary", fmt.Sprintf("D%d", rowIdx), isSerialized)
				f.SetCellValue("Stock Summary", fmt.Sprintf("E%d", rowIdx), totalIn)
				f.SetCellValue("Stock Summary", fmt.Sprintf("F%d", rowIdx), totalOut)
				f.SetCellValue("Stock Summary", fmt.Sprintf("G%d", rowIdx), net)
				f.SetCellValue("Stock Summary", fmt.Sprintf("H%d", rowIdx), status)
				f.SetCellValue("Stock Summary", fmt.Sprintf("I%d", rowIdx), unitCost)
				f.SetCellValue("Stock Summary", fmt.Sprintf("J%d", rowIdx), stockValue)
				rowIdx++
			}
		}
	}

	// Serialized Inventory Sheet
	serialHeaders := []string{"Asset ID", "SKU", "Model", "Serial Number", "MAC Address", "Status", "Condition", "Location", "Custodian"}
	for colIdx, h := range serialHeaders {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		f.SetCellValue("Serialized Inventory", cell, h)
	}

	sRows, err := db.Query(`
		SELECT s.asset_id, s.sku, s.model, s.serial_number, COALESCE(s.mac_address, 'N/A'), 
		       s.status, s.condition, s.current_location, COALESCE(u.name, 'Store')
		FROM serialized_units s
		LEFT JOIN users u ON s.current_custodian_id = u.id
		ORDER BY s.asset_id ASC
	`)
	if err == nil {
		defer sRows.Close()
		rowIdx := 2
		for sRows.Next() {
			var assetID, sku, model, sn, mac, status, cond, loc, custodian string
			if err := sRows.Scan(&assetID, &sku, &model, &sn, &mac, &status, &cond, &loc, &custodian); err == nil {
				f.SetCellValue("Serialized Inventory", fmt.Sprintf("A%d", rowIdx), assetID)
				f.SetCellValue("Serialized Inventory", fmt.Sprintf("B%d", rowIdx), sku)
				f.SetCellValue("Serialized Inventory", fmt.Sprintf("C%d", rowIdx), model)
				f.SetCellValue("Serialized Inventory", fmt.Sprintf("D%d", rowIdx), sn)
				f.SetCellValue("Serialized Inventory", fmt.Sprintf("E%d", rowIdx), mac)
				f.SetCellValue("Serialized Inventory", fmt.Sprintf("F%d", rowIdx), status)
				f.SetCellValue("Serialized Inventory", fmt.Sprintf("G%d", rowIdx), cond)
				f.SetCellValue("Serialized Inventory", fmt.Sprintf("H%d", rowIdx), loc)
				f.SetCellValue("Serialized Inventory", fmt.Sprintf("I%d", rowIdx), custodian)
				rowIdx++
			}
		}
	}

	// Audit Ledger Sheet
	ledgerHeaders := []string{"Txn ID", "Date", "Direction", "SKU", "Asset ID", "Qty", "Unit Cost", "Total Cost", "Performed By", "Cost Type", "Task ID", "Site", "Notes"}
	for colIdx, h := range ledgerHeaders {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		f.SetCellValue("Audit Ledger", cell, h)
	}

	lRows, err := db.Query(`
		SELECT l.id, l.date, l.direction, l.sku, COALESCE(l.asset_id, 'N/A'), l.quantity,
		       l.unit_cost, l.total_cost, u.name, l.cost_type, COALESCE(l.task_id, ''),
		       COALESCE(l.site, ''), COALESCE(l.notes, '')
		FROM transaction_ledger l
		JOIN users u ON l.performed_by_id = u.id
		ORDER BY l.created_at DESC
	`)
	if err == nil {
		defer lRows.Close()
		rowIdx := 2
		for lRows.Next() {
			var id, date, dir, sku, assetID, userName, costType, taskID, site, notes string
			var qty int
			var unitCost, totalCost float64
			if err := lRows.Scan(&id, &date, &dir, &sku, &assetID, &qty, &unitCost, &totalCost, &userName, &costType, &taskID, &site, &notes); err == nil {
				f.SetCellValue("Audit Ledger", fmt.Sprintf("A%d", rowIdx), id)
				f.SetCellValue("Audit Ledger", fmt.Sprintf("B%d", rowIdx), date)
				f.SetCellValue("Audit Ledger", fmt.Sprintf("C%d", rowIdx), dir)
				f.SetCellValue("Audit Ledger", fmt.Sprintf("D%d", rowIdx), sku)
				f.SetCellValue("Audit Ledger", fmt.Sprintf("E%d", rowIdx), assetID)
				f.SetCellValue("Audit Ledger", fmt.Sprintf("F%d", rowIdx), qty)
				f.SetCellValue("Audit Ledger", fmt.Sprintf("G%d", rowIdx), unitCost)
				f.SetCellValue("Audit Ledger", fmt.Sprintf("H%d", rowIdx), totalCost)
				f.SetCellValue("Audit Ledger", fmt.Sprintf("I%d", rowIdx), userName)
				f.SetCellValue("Audit Ledger", fmt.Sprintf("J%d", rowIdx), costType)
				f.SetCellValue("Audit Ledger", fmt.Sprintf("K%d", rowIdx), taskID)
				f.SetCellValue("Audit Ledger", fmt.Sprintf("L%d", rowIdx), site)
				f.SetCellValue("Audit Ledger", fmt.Sprintf("M%d", rowIdx), notes)
				rowIdx++
			}
		}
	}

	fileName := fmt.Sprintf("ont_inventory_report_%s.xlsx", time.Now().Format("20060102_150405"))
	if err := f.SaveAs(fileName); err != nil {
		log.Fatalf("Failed to save excel file: %v", err)
	}

	fmt.Printf("Excel report generated successfully: %s\n", fileName)
}
