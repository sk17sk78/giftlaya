package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
)

type mockCatalogRepo struct {
	products   map[int64]domain.Product
	categories []domain.Category
	addons     []domain.ProductAddon
	navs       []domain.NavigationItem
	nextID     int64
}

func newMockCatalogRepo() *mockCatalogRepo {
	return &mockCatalogRepo{
		products: make(map[int64]domain.Product),
		nextID:   1,
	}
}

func (m *mockCatalogRepo) ListProducts(_ context.Context, f domain.ProductListFilter) ([]domain.Product, int64, error) {
	var out []domain.Product
	for _, p := range m.products {
		if f.SellerID != nil && (p.SellerID == nil || *p.SellerID != *f.SellerID) {
			continue
		}
		out = append(out, p)
	}
	return out, int64(len(out)), nil
}

func (m *mockCatalogRepo) GetProductByIDOrSlug(_ context.Context, id *int64, slug string) (*domain.Product, error) {
	if id != nil {
		if p, ok := m.products[*id]; ok {
			copyP := p
			return &copyP, nil
		}
	}
	for _, p := range m.products {
		if slug != "" && p.Slug == slug {
			copyP := p
			return &copyP, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockCatalogRepo) CreateProduct(_ context.Context, p *domain.Product) (*domain.Product, error) {
	copyP := *p
	copyP.ID = m.nextID
	m.nextID++
	m.products[copyP.ID] = copyP
	return &copyP, nil
}

func (m *mockCatalogRepo) UpdateProduct(_ context.Context, p *domain.Product) (*domain.Product, error) {
	if _, ok := m.products[p.ID]; !ok {
		return nil, domain.ErrNotFound
	}
	copyP := *p
	m.products[p.ID] = copyP
	return &copyP, nil
}

func (m *mockCatalogRepo) SoftDeleteProduct(_ context.Context, id int64) error {
	if _, ok := m.products[id]; !ok {
		return domain.ErrNotFound
	}
	delete(m.products, id)
	return nil
}

func (m *mockCatalogRepo) DuplicateProduct(_ context.Context, id int64) (*domain.Product, error) {
	orig, ok := m.products[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	dup := orig
	dup.ID = m.nextID
	m.nextID++
	dup.SKU = orig.SKU + "-COPY"
	dup.Slug = orig.Slug + "-copy"
	m.products[dup.ID] = dup
	return &dup, nil
}

func (m *mockCatalogRepo) BulkUpdateProducts(_ context.Context, items []domain.BulkProductUpdateItem) error {
	for _, it := range items {
		p, ok := m.products[it.ProductID]
		if !ok {
			return domain.ErrNotFound
		}
		if it.SellingPricePaise != nil {
			p.SellingPricePaise = *it.SellingPricePaise
		}
		if it.StockQty != nil {
			p.StockQty = *it.StockQty
		}
		m.products[it.ProductID] = p
	}
	return nil
}

func (m *mockCatalogRepo) ListAddons(_ context.Context, _ string, _, _ int) ([]domain.ProductAddon, int64, error) {
	return m.addons, int64(len(m.addons)), nil
}
func (m *mockCatalogRepo) CreateAddon(_ context.Context, a *domain.ProductAddon) (*domain.ProductAddon, error) {
	c := *a
	c.ID = 1
	m.addons = append(m.addons, c)
	return &c, nil
}
func (m *mockCatalogRepo) UpdateAddon(_ context.Context, a *domain.ProductAddon) (*domain.ProductAddon, error) {
	return a, nil
}
func (m *mockCatalogRepo) DeleteAddon(_ context.Context, _ int64) error { return nil }
func (m *mockCatalogRepo) ListCategories(_ context.Context, _, _ string) ([]domain.Category, error) {
	return m.categories, nil
}
func (m *mockCatalogRepo) GetCategoryByIDOrSlug(_ context.Context, id *int64, _ string) (*domain.Category, error) {
	if id != nil {
		for _, c := range m.categories {
			if c.ID == *id {
				return &c, nil
			}
		}
	}
	return nil, domain.ErrNotFound
}
func (m *mockCatalogRepo) CreateCategory(_ context.Context, c *domain.Category) (*domain.Category, error) {
	return c, nil
}
func (m *mockCatalogRepo) UpdateCategory(_ context.Context, c *domain.Category) (*domain.Category, error) {
	return c, nil
}
func (m *mockCatalogRepo) SoftDeleteCategory(_ context.Context, _ int64) error { return nil }
func (m *mockCatalogRepo) ListNavigation(_ context.Context) ([]domain.NavigationItem, error) {
	return m.navs, nil
}
func (m *mockCatalogRepo) CreateNavigationItem(_ context.Context, n *domain.NavigationItem) (*domain.NavigationItem, error) {
	return n, nil
}
func (m *mockCatalogRepo) UpdateNavigationItem(_ context.Context, n *domain.NavigationItem) (*domain.NavigationItem, error) {
	return n, nil
}
func (m *mockCatalogRepo) DeleteNavigationItem(_ context.Context, _ int64) error { return nil }

type mockOrderRepo struct {
	orders map[int64]*domain.Order
	hasDec map[int64]bool
}

func newMockOrderRepo() *mockOrderRepo {
	return &mockOrderRepo{
		orders: make(map[int64]*domain.Order),
		hasDec: make(map[int64]bool),
	}
}

func (m *mockOrderRepo) CreateOrderTx(_ context.Context, in domain.CreateOrderInput, _, _ int) (*domain.Order, error) {
	o := &domain.Order{
		ID:             1,
		OrderNumber:    "GL-2026-0001",
		CityID:         in.CityID,
		CustomerID:     in.CustomerID,
		Status:         domain.OrderStatusPlaced,
		DeliveryDate:   &in.DeliveryDate,
		SubtotalPaise:  250000,
		TotalPaise:     250000,
		RecipientName:  in.RecipientName,
		RecipientPhone: in.RecipientPhone,
	}
	m.orders[1] = o
	return o, nil
}

func (m *mockOrderRepo) ListOrders(_ context.Context, f domain.OrderListFilter) ([]domain.Order, int64, error) {
	var out []domain.Order
	for _, o := range m.orders {
		if f.SellerID != nil {
			matched := false
			for _, it := range o.Items {
				if it.SellerID != nil && *it.SellerID == *f.SellerID {
					matched = true
				}
			}
			if !matched {
				continue
			}
		}
		out = append(out, *o)
	}
	return out, int64(len(out)), nil
}

func (m *mockOrderRepo) GetOrderByIDOrNumber(_ context.Context, id *int64, num string) (*domain.Order, error) {
	if id != nil {
		if o, ok := m.orders[*id]; ok {
			copyO := *o
			return &copyO, nil
		}
	}
	for _, o := range m.orders {
		if num != "" && o.OrderNumber == num {
			copyO := *o
			return &copyO, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockOrderRepo) UpdateOrderStatusTx(_ context.Context, orderID int64, toStatus, actorType string, _ *int64, _ string, cancelCutoffHours int, cancelFeePercent int) (*domain.Order, error) {
	o, ok := m.orders[orderID]
	if !ok {
		return nil, domain.ErrNotFound
	}
	if !domain.CanTransitionOrder(o.Status, toStatus) {
		return nil, domain.ErrInvalidTransition
	}
	if toStatus == domain.OrderStatusCancelled && m.hasDec[orderID] && o.DeliveryDate != nil {
		d, _ := time.Parse("2006-01-02", *o.DeliveryDate)
		hoursUntil := time.Until(d).Hours()
		if hoursUntil < float64(cancelCutoffHours) && actorType != "admin" {
			return nil, domain.ErrCancelNotAllowed
		}
		o.CancellationFeePaise = (o.TotalPaise * int64(cancelFeePercent)) / 100
	}
	o.Status = toStatus
	copyO := *o
	return &copyO, nil
}

func (m *mockOrderRepo) AssignOrder(_ context.Context, orderID int64, teamID *int64, name, phone string, adminID *int64) (*domain.OrderAssignment, error) {
	return &domain.OrderAssignment{OrderID: orderID, DecoratorTeamID: teamID, DeliveryPartnerName: name, DeliveryPartnerPhone: phone, AssignedByAdminID: adminID}, nil
}

func (m *mockOrderRepo) UpdateOrderTrackingNotes(_ context.Context, orderID int64, trackingID, notes string) (*domain.Order, error) {
	o, ok := m.orders[orderID]
	if !ok {
		return nil, domain.ErrNotFound
	}
	o.TrackingID = trackingID
	o.InternalNotes = notes
	return o, nil
}

func (m *mockOrderRepo) GetCalendarBookings(_ context.Context, _ string, _ *int64) ([]map[string]any, error) {
	return nil, nil
}
func (m *mockOrderRepo) ListOrderUploads(_ context.Context, _ *int64, _, _ int) ([]domain.OrderUploadEntry, int64, error) {
	return nil, 0, nil
}
func (m *mockOrderRepo) ListPaymentLinks(_ context.Context, _, _ int) ([]domain.PaymentLink, int64, error) {
	return nil, 0, nil
}
func (m *mockOrderRepo) CreatePaymentLink(_ context.Context, link *domain.PaymentLink) (*domain.PaymentLink, error) {
	return link, nil
}
func (m *mockOrderRepo) ListInvoices(_ context.Context, _, _ int) ([]domain.Invoice, int64, error) {
	return nil, 0, nil
}
func (m *mockOrderRepo) GetOrGenerateInvoice(_ context.Context, orderID int64, gstin string) (*domain.Invoice, error) {
	return &domain.Invoice{OrderID: orderID, GSTINSeller: gstin, InvoiceNumber: "INV-2026-0001"}, nil
}

type mockCoinsCreditor struct {
	creditedCoins int
	orderID       int64
}

func (c *mockCoinsCreditor) CreditDeliveredOrderCoins(_ context.Context, o *domain.Order, earnPct int) error {
	c.creditedCoins = int(((o.SubtotalPaise / 100) * int64(earnPct)) / 100)
	c.orderID = o.ID
	return nil
}

func TestComputeDiscountPercentAndSlugify(t *testing.T) {
	if got := ComputeDiscountPercent(100000, 75000); got != 25 {
		t.Fatalf("expected 25%% discount, got %d", got)
	}
	if got := ComputeDiscountPercent(50000, 60000); got != 0 {
		t.Fatalf("expected 0%% when price >= mrp, got %d", got)
	}
	if got := ComputeDiscountPercent(0, 1000); got != 0 {
		t.Fatalf("expected 0%% when mrp is 0, got %d", got)
	}
	if got := Slugify("  Red Velvet Cake (1 Kg)! "); got != "red-velvet-cake-1-kg" {
		t.Fatalf("unexpected slug: %q", got)
	}
}

func TestBuildCategoryTree(t *testing.T) {
	p1 := int64(1)
	flat := []domain.Category{
		{ID: 1, Name: "Cakes"},
		{ID: 2, ParentID: &p1, Name: "Designer Cakes"},
		{ID: 3, Name: "Flowers"},
	}
	tree := BuildCategoryTree(flat)
	if len(tree) != 2 || len(tree[0].Children) != 1 || tree[0].Children[0].Name != "Designer Cakes" {
		t.Fatalf("unexpected category tree: %+v", tree)
	}
}

func TestOrderStateMachine(t *testing.T) {
	validPairs := [][2]string{
		{"placed", "confirmed"},
		{"placed", "cancelled"},
		{"confirmed", "assigned"},
		{"assigned", "out_for_delivery"},
		{"out_for_delivery", "delivered"},
		{"delivered", "refunded"},
		{"cancelled", "refunded"},
	}
	for _, p := range validPairs {
		if !domain.CanTransitionOrder(p[0], p[1]) {
			t.Fatalf("expected %s -> %s to be valid", p[0], p[1])
		}
	}

	invalidPairs := [][2]string{
		{"placed", "placed"},
		{"placed", "delivered"},
		{"confirmed", "delivered"},
		{"delivered", "cancelled"},
		{"refunded", "placed"},
	}
	for _, p := range invalidPairs {
		if domain.CanTransitionOrder(p[0], p[1]) {
			t.Fatalf("expected %s -> %s to be INVALID", p[0], p[1])
		}
	}
}

func TestCatalogCSVImportExportAndVendorScope(t *testing.T) {
	repo := newMockCatalogRepo()
	svc := NewCatalogService(repo, nil)

	seller1 := int64(10)
	seller2 := int64(20)
	vendor1 := &domain.AdminProfile{ID: 101, Username: "vendor1", SellerID: &seller1}
	vendor2 := &domain.AdminProfile{ID: 102, Username: "vendor2", SellerID: &seller2}

	csvData := []byte("name,sku,product_type,mrp_rupees,selling_price_rupees,stock_qty,status,is_eggless\nChocolate Truffle,CAK-100,cake,1000,800,15,published,true\n")
	summary, err := svc.ImportProductsCSV(context.Background(), csvData, vendor1, "req-1", "127.0.0.1")
	if err != nil {
		t.Fatalf("csv import failed: %v", err)
	}
	if summary.Imported != 1 || len(summary.Errors) != 0 {
		t.Fatalf("unexpected import summary: %+v", summary)
	}

	p, err := svc.GetProduct(context.Background(), nil, "", vendor1)
	_ = p
	list1, total1, err := svc.ListProducts(context.Background(), domain.ProductListFilter{}, vendor1)
	if err != nil || total1 != 1 {
		t.Fatalf("vendor1 list failed: err=%v total=%d", err, total1)
	}
	if list1[0].DiscountPercent != 20 {
		t.Fatalf("expected computed discount 20%%, got %d", list1[0].DiscountPercent)
	}

	// Vendor 2 must NOT read or update Vendor 1's product
	pid := list1[0].ID
	if _, err := svc.GetProduct(context.Background(), &pid, "", vendor2); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("expected ErrForbidden for cross-vendor get, got %v", err)
	}

	csvOut, err := svc.ExportProductsCSV(context.Background(), domain.ProductListFilter{}, vendor1)
	if err != nil || len(csvOut) == 0 {
		t.Fatalf("csv export failed: %v", err)
	}
}

func TestOrderVendorScopeAndDecorationCancellation(t *testing.T) {
	ctx := context.Background()
	repo := newMockOrderRepo()
	coins := &mockCoinsCreditor{}
	svc := NewOrderService(repo, nil, coins, nil, nil)

	seller1 := int64(10)
	seller2 := int64(20)
	custID := int64(500)
	soonDate := time.Now().Add(6 * time.Hour).Format("2006-01-02")
	laterDate := time.Now().Add(72 * time.Hour).Format("2006-01-02")

	repo.orders[1] = &domain.Order{
		ID:            1,
		OrderNumber:   "GL-2026-1001",
		CustomerID:    &custID,
		Status:        domain.OrderStatusConfirmed,
		DeliveryDate:  &soonDate,
		SubtotalPaise: 200000,
		TotalPaise:    200000,
		Items:         []domain.OrderItem{{ID: 1, SellerID: &seller1}},
	}
	repo.hasDec[1] = true

	repo.orders[2] = &domain.Order{
		ID:            2,
		OrderNumber:   "GL-2026-1002",
		CustomerID:    &custID,
		Status:        domain.OrderStatusConfirmed,
		DeliveryDate:  &laterDate,
		SubtotalPaise: 400000,
		TotalPaise:    400000,
		Items:         []domain.OrderItem{{ID: 2, SellerID: &seller1}},
	}
	repo.hasDec[2] = true

	vendor2 := &domain.AdminProfile{ID: 2, SellerID: &seller2}
	if _, err := svc.GetOrder(ctx, &repo.orders[1].ID, "", vendor2); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("expected ErrForbidden for vendor2 accessing vendor1 order, got %v", err)
	}

	// Customer attempting to cancel decoration inside 24h window -> ErrCancelNotAllowed
	if _, err := svc.UpdateOrderStatus(ctx, 1, domain.OrderStatusCancelled, "customer request", nil, "customer", "r1", "127.0.0.1"); !errors.Is(err, domain.ErrCancelNotAllowed) {
		t.Fatalf("expected ErrCancelNotAllowed inside 24h window, got %v", err)
	}

	// Cancellation > 24h before event applies 25% cancellation fee (25% of 400000 = 100000)
	cancelled, err := svc.UpdateOrderStatus(ctx, 2, domain.OrderStatusCancelled, "customer >24h", nil, "customer", "r2", "127.0.0.1")
	if err != nil {
		t.Fatalf("expected >24h cancel to succeed, got %v", err)
	}
	if cancelled.CancellationFeePaise != 100000 {
		t.Fatalf("expected 100000 paise (25%%) fee, got %d", cancelled.CancellationFeePaise)
	}

	// Delivered flow awards 10% coins (2000 INR * 10% = 200 coins)
	adminUser := &domain.AdminProfile{ID: 1, Username: "superadmin"}
	_, _ = svc.UpdateOrderStatus(ctx, 1, domain.OrderStatusAssigned, "assign", adminUser, "admin", "r3", "127.0.0.1")
	_, _ = svc.UpdateOrderStatus(ctx, 1, domain.OrderStatusOutForDelivery, "dispatch", adminUser, "admin", "r4", "127.0.0.1")
	_, err = svc.UpdateOrderStatus(ctx, 1, domain.OrderStatusDelivered, "done", adminUser, "admin", "r5", "127.0.0.1")
	if err != nil {
		t.Fatalf("deliver transition failed: %v", err)
	}
	if coins.creditedCoins != 200 {
		t.Fatalf("expected 200 earned coins on delivery, got %d", coins.creditedCoins)
	}

	// Invalid transition rejected
	if _, err := svc.UpdateOrderStatus(ctx, 1, domain.OrderStatusCancelled, "after delivered", adminUser, "admin", "r6", "127.0.0.1"); !errors.Is(err, domain.ErrInvalidTransition) {
		t.Fatalf("expected ErrInvalidTransition from delivered -> cancelled, got %v", err)
	}
}

func TestSlugifyPathAddonsAndOrderPayload(t *testing.T) {
	if got := SlugifyPath(" Birthday Decoration / Kids Theme "); got != "birthday-decoration/kids-theme" {
		t.Fatalf("unexpected SlugifyPath: %q", got)
	}
	catRepo := newMockCatalogRepo()
	catSvc := NewCatalogService(catRepo, nil)
	catID := int64(109)
	addon, err := catSvc.CreateAddon(context.Background(), &domain.ProductAddon{
		AddonCategoryID: &catID,
		Name:            "Red Velvet Half kg Cake",
		PricePaise:      149900,
		IsActive:        true,
	}, nil, "req-a1", "127.0.0.1")
	if err != nil || addon.Slug != "red-velvet-half-kg-cake" || addon.AddonCategoryID == nil || *addon.AddonCategoryID != 109 {
		t.Fatalf("unexpected addon creation result: %+v err=%v", addon, err)
	}

	ordRepo := newMockOrderRepo()
	ordSvc := NewOrderService(ordRepo, nil, &mockCoinsCreditor{}, nil, nil)
	created, err := ordSvc.CreateOrder(context.Background(), domain.CreateOrderInput{
		CityID:         1,
		DeliveryDate:   "2026-12-20",
		RecipientName:  "Ananya",
		RecipientPhone: "9830011223",
		PaymentMethod:  "razorpay",
		Items: []domain.CreateOrderItemInput{
			{
				ProductID: 1,
				Qty:       1,
				Addons:    []domain.CreateOrderAddonInput{{AddonID: addon.ID, Qty: 2}},
			},
		},
	}, nil, "req-o1", "127.0.0.1")
	if err != nil || created.OrderNumber == "" {
		t.Fatalf("expected order creation to succeed, got %+v err=%v", created, err)
	}

	// Cancelled or delivered orders must reject partner assignment
	ordRepo.orders[99] = &domain.Order{ID: 99, OrderNumber: "GL-2026-0099", Status: domain.OrderStatusCancelled}
	if _, err := ordSvc.AssignOrder(context.Background(), 99, nil, "Rider", "9800000000", nil, "req-a2", "127.0.0.1"); !errors.Is(err, domain.ErrInvalidTransition) {
		t.Fatalf("expected ErrInvalidTransition assigning cancelled order, got %v", err)
	}
}

func TestCatalogValidationRejectsInvalidTypesAndKinds(t *testing.T) {
	catRepo := newMockCatalogRepo()
	catRepo.categories = append(catRepo.categories, domain.Category{ID: 1, Name: "Cakes", Slug: "cakes", Kind: "product"})
	catSvc := NewCatalogService(catRepo, nil)

	if _, err := catSvc.CreateProduct(context.Background(), &domain.Product{
		Name: "Invalid Type", SKU: "BAD-1", ProductType: "gift",
	}, nil, "req-v1", "127.0.0.1"); !errors.Is(err, domain.ErrValidation) {
		t.Fatalf("expected ErrValidation for invalid product_type, got %v", err)
	}

	if _, err := catSvc.CreateProduct(context.Background(), &domain.Product{
		Name: "Invalid Status", SKU: "BAD-2", ProductType: "cake", Status: "invalid_status",
	}, nil, "req-v2", "127.0.0.1"); !errors.Is(err, domain.ErrValidation) {
		t.Fatalf("expected ErrValidation for invalid status, got %v", err)
	}

	if _, err := catSvc.UpdateCategory(context.Background(), 1, &domain.Category{
		Name: "Cakes Updated", Kind: "invalid_kind",
	}, nil, "req-v3", "127.0.0.1"); !errors.Is(err, domain.ErrValidation) {
		t.Fatalf("expected ErrValidation for invalid category kind, got %v", err)
	}
}


