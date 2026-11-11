package service

import (
	"bytes"
	"fmt"
	"strings"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
)

func escapePDFString(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `(`, `\(`)
	s = strings.ReplaceAll(s, `)`, `\)`)
	return s
}

// GenerateInvoicePDF renders a valid self-contained single-page PDF 1.4 tax invoice with GST breakdown.
func GenerateInvoicePDF(order *domain.Order, inv *domain.Invoice) []byte {
	lines := []string{
		"GIFTLAYA TAX INVOICE",
		fmt.Sprintf("Invoice Number: %s", inv.InvoiceNumber),
		fmt.Sprintf("Order Number:   %s", order.OrderNumber),
		fmt.Sprintf("Date:           %s", inv.GeneratedAt.Format("02 Jan 2006 15:04 IST")),
		fmt.Sprintf("Seller GSTIN:   %s", inv.GSTINSeller),
		"------------------------------------------------------------",
		fmt.Sprintf("Bill / Ship To: %s (%s)", order.RecipientName, order.RecipientPhone),
		fmt.Sprintf("Delivery City:  %s | Date: %s", order.CityName, derefStr(order.DeliveryDate)),
		"------------------------------------------------------------",
		"Items:",
	}
	for idx, it := range order.Items {
		lines = append(lines, fmt.Sprintf(
			"%d. %-28s x%d   INR %.2f",
			idx+1,
			truncateStr(it.ProductTitle, 28),
			it.Qty,
			float64(it.LineTotalPaise)/100,
		))
	}
	lines = append(lines,
		"------------------------------------------------------------",
		fmt.Sprintf("Subtotal:         INR %.2f", float64(order.SubtotalPaise)/100),
		fmt.Sprintf("Delivery & Slot:  INR %.2f", float64(order.DeliveryFeePaise+order.SlotSurchargePaise)/100),
		fmt.Sprintf("GST (CGST+SGST):  INR %.2f", float64(order.TaxGSTPaise)/100),
		fmt.Sprintf("Coupon/Coins Disc:INR -%.2f", float64(order.CouponDiscountPaise+order.CoinsDiscountPaise)/100),
		fmt.Sprintf("GRAND TOTAL:      INR %.2f", float64(order.TotalPaise)/100),
		fmt.Sprintf("Payment Status:   %s (%s)", strings.ToUpper(order.PaymentStatus), strings.ToUpper(order.PaymentMethod)),
		fmt.Sprintf("Generated On:     %s", time.Now().Format("2006-01-02")),
		"Thank you for gifting with Giftlaya!",
	)

	var content bytes.Buffer
	content.WriteString("BT\n/F1 11 Tf\n50 770 Td\n16 TL\n")
	for i, line := range lines {
		if i == 0 {
			content.WriteString(fmt.Sprintf("(%s) Tj\n", escapePDFString(line)))
		} else {
			content.WriteString(fmt.Sprintf("T* (%s) Tj\n", escapePDFString(line)))
		}
	}
	content.WriteString("ET\n")

	objs := []string{
		"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
		"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
		"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
		fmt.Sprintf("4 0 obj\n<< /Length %d >>\nstream\n%sendstream\nendobj\n", content.Len(), content.String()),
		"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n",
	}

	var pdf bytes.Buffer
	pdf.WriteString("%PDF-1.4\n")
	offsets := make([]int, len(objs)+1)
	for i, obj := range objs {
		offsets[i+1] = pdf.Len()
		pdf.WriteString(obj)
	}
	xrefOffset := pdf.Len()
	pdf.WriteString(fmt.Sprintf("xref\n0 %d\n0000000000 65535 f \n", len(objs)+1))
	for i := 1; i <= len(objs); i++ {
		pdf.WriteString(fmt.Sprintf("%010d 00000 n \n", offsets[i]))
	}
	pdf.WriteString(fmt.Sprintf("trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n", len(objs)+1, xrefOffset))
	return pdf.Bytes()
}

func derefStr(p *string) string {
	if p == nil {
		return "-"
	}
	return *p
}

func truncateStr(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-1] + "."
}

