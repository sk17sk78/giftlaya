package repository

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math"
	"math/big"
	"strings"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OrderRepo struct {
	pool *pgxpool.Pool
}

func NewOrderRepo(pool *pgxpool.Pool) *OrderRepo {
	return &OrderRepo{pool: pool}
}

func (r *OrderRepo) CreateOrderTx(ctx context.Context, in domain.CreateOrderInput, _ int, _ int) (*domain.Order, error) {
	delivDate, err := time.Parse("2006-01-02", in.DeliveryDate)
	if err != nil {
		return nil, fmt.Errorf("%w: invalid delivery_date (YYYY-MM-DD)", domain.ErrValidation)
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// 1. Validate city & optional pincode serviceability
	var baseDeliveryPaise int64
	var cutoffStr string
	var midnightAllowed, cityActive bool
	err = tx.QueryRow(ctx, `
		SELECT base_delivery_charge_paise, TO_CHAR(same_day_cutoff_time, 'HH24:MI'), midnight_available, is_active
		FROM cities WHERE id = $1
	`, in.CityID).Scan(&baseDeliveryPaise, &cutoffStr, &midnightAllowed, &cityActive)
	if err != nil || !cityActive {
		return nil, domain.ErrNotServiceable
	}

	var pincodeExtraPaise int64
	if strings.TrimSpace(in.Pincode) != "" {
		var serviceable bool
		err = tx.QueryRow(ctx, `
			SELECT extra_charge_paise, is_serviceable FROM pincodes
			WHERE city_id = $1 AND code = $2
		`, in.CityID, strings.TrimSpace(in.Pincode)).Scan(&pincodeExtraPaise, &serviceable)
		if err == nil && !serviceable {
			return nil, domain.ErrNotServiceable
		}
	}

	// 2. Check blackout dates
	var blackoutSurgePaise int64
	var blockSameDay bool
	err = tx.QueryRow(ctx, `
		SELECT block_same_day, extra_surge_paise
		FROM blackout_dates
		WHERE blackout_date = $1 AND (city_id = $2 OR city_id IS NULL)
		ORDER BY city_id NULLS LAST
		LIMIT 1
	`, delivDate, in.CityID).Scan(&blockSameDay, &blackoutSurgePaise)
	if err == nil {
		if blockSameDay {
			return nil, domain.ErrBlackoutDate
		}
	}

	// Same-day cutoff check (if today)
	now := time.Now()
	isSameDay := delivDate.Format("2006-01-02") == now.Format("2006-01-02")
	if isSameDay && cutoffStr != "" {
		if parsedCut, parseErr := time.Parse("15:04", cutoffStr); parseErr == nil {
			cutToday := time.Date(now.Year(), now.Month(), now.Day(), parsedCut.Hour(), parsedCut.Minute(), 0, 0, now.Location())
			if now.After(cutToday) {
				return nil, domain.ErrCutoffPassed
			}
		}
	}

	// 3. Lock slot capacity row (SELECT ... FOR UPDATE) if a slot was selected
	var slotSurchargePaise int64
	if in.SlotTemplateID != nil {
		var slotDefaultCap, slotExtra int
		var isMidnight, slotActive bool
		var slotStartStr string
		err = tx.QueryRow(ctx, `
			SELECT default_capacity, extra_charge_paise, is_midnight, is_active, TO_CHAR(start_time, 'HH24:MI')
			FROM time_slot_templates WHERE id = $1
		`, *in.SlotTemplateID).Scan(&slotDefaultCap, &slotExtra, &isMidnight, &slotActive, &slotStartStr)
		if err != nil || !slotActive || (isMidnight && !midnightAllowed) {
			return nil, domain.ErrSlotFull
		}
		if isSameDay && slotStartStr != "" {
			if parsedStart, parseErr := time.Parse("15:04", slotStartStr); parseErr == nil {
				slotStartToday := time.Date(now.Year(), now.Month(), now.Day(), parsedStart.Hour(), parsedStart.Minute(), 0, 0, now.Location())
				if now.After(slotStartToday) {
					return nil, domain.ErrCutoffPassed
				}
			}
		}
		slotSurchargePaise = int64(slotExtra)

		// Ensure ledger row exists, then lock it with SELECT ... FOR UPDATE
		if _, err := tx.Exec(ctx, `
			INSERT INTO slot_capacity_ledger (city_id, slot_template_id, service_date, max_capacity, reserved_count)
			VALUES ($1, $2, $3, $4, 0)
			ON CONFLICT (city_id, slot_template_id, service_date) DO NOTHING
		`, in.CityID, *in.SlotTemplateID, delivDate, slotDefaultCap); err != nil {
			return nil, mapErr(err)
		}

		var ledgerID int64
		var maxCap, reserved int
		var blocked bool
		err = tx.QueryRow(ctx, `
			SELECT id, max_capacity, reserved_count, is_blocked
			FROM slot_capacity_ledger
			WHERE city_id = $1 AND slot_template_id = $2 AND service_date = $3
			FOR UPDATE
		`, in.CityID, *in.SlotTemplateID, delivDate).Scan(&ledgerID, &maxCap, &reserved, &blocked)
		if err != nil {
			return nil, mapErr(err)
		}
		if blocked || reserved >= maxCap {
			return nil, domain.ErrSlotFull
		}
		if _, err := tx.Exec(ctx, `UPDATE slot_capacity_ledger SET reserved_count = reserved_count + 1 WHERE id = $1`, ledgerID); err != nil {
			return nil, mapErr(err)
		}
	}

	// 4. Lock products & variants FOR UPDATE, compute authoritative prices & taxes
	type builtItem struct {
		productID        int64
		variantID        *int64
		sellerID         *int64
		title            string
		sku              string
		itemType         string
		qty              int
		unitPricePaise   int64
		lineTotalPaise   int64
		commissionPct    float64
		sellerPayout     int64
		gstPaise         int64
		personalization  json.RawMessage
		addons           json.RawMessage
		categoryIDs      []int64
	}

	var subtotalPaise int64
	var totalTaxPaise int64
	var hasExplicitDeliveryOverride bool
	var builtItems []builtItem

	for _, item := range in.Items {
		var pName, pSKU, pType, pStatus string
		var pPricePaise int64
		var pStock int
		var trackStock, availAll bool
		var sellerID *int64
		var hasVeg bool
		var vegDelta, nonVegDelta int
		var gstRate float64
		var pCutoff *string

		err = tx.QueryRow(ctx, `
			SELECT name, sku, product_type, status, selling_price_paise, stock_qty, track_stock,
			       available_all_cities, seller_id, has_veg_nonveg, veg_delta_paise, nonveg_delta_paise,
			       gst_rate_percent::FLOAT8,
			       CASE WHEN cutoff_time IS NOT NULL THEN TO_CHAR(cutoff_time, 'HH24:MI') ELSE NULL END
			FROM products
			WHERE id = $1 AND deleted_at IS NULL
			FOR UPDATE
		`, item.ProductID).Scan(
			&pName, &pSKU, &pType, &pStatus, &pPricePaise, &pStock, &trackStock,
			&availAll, &sellerID, &hasVeg, &vegDelta, &nonVegDelta, &gstRate, &pCutoff,
		)
		if err != nil || pStatus != "published" {
			return nil, domain.ErrNotFound
		}

		if isSameDay && pCutoff != nil {
			if pc, pErr := time.Parse("15:04", *pCutoff); pErr == nil {
				ct := time.Date(now.Year(), now.Month(), now.Day(), pc.Hour(), pc.Minute(), 0, 0, now.Location())
				if now.After(ct) {
					return nil, domain.ErrCutoffPassed
				}
			}
		}

		// Per-city availability & price override
		var ovAvail bool
		var ovPrice *int64
		var ovDelivery *int
		ovErr := tx.QueryRow(ctx, `
			SELECT is_available, price_override_paise, delivery_charge_paise
			FROM city_product_overrides WHERE product_id = $1 AND city_id = $2
		`, item.ProductID, in.CityID).Scan(&ovAvail, &ovPrice, &ovDelivery)
		if ovErr == nil {
			if !ovAvail {
				return nil, domain.ErrNotServiceable
			}
			if ovPrice != nil {
				pPricePaise = *ovPrice
			}
			if ovDelivery != nil {
				baseDeliveryPaise = int64(*ovDelivery)
				hasExplicitDeliveryOverride = true
			}
		} else if !availAll {
			return nil, domain.ErrNotServiceable
		}

		unitPrice := pPricePaise

		// Lock variant stock if chosen
		if item.VariantID != nil {
			var varPrice int64
			var varStock int
			var varLabel, varSuffix string
			err = tx.QueryRow(ctx, `
				SELECT label, sku_suffix, price_paise, stock_qty
				FROM product_variants WHERE id = $1 AND product_id = $2 AND is_active = TRUE
				FOR UPDATE
			`, *item.VariantID, item.ProductID).Scan(&varLabel, &varSuffix, &varPrice, &varStock)
			if err != nil {
				return nil, domain.ErrNotFound
			}
			if trackStock && varStock < item.Qty {
				return nil, domain.ErrInsufficientStock
			}
			if trackStock {
				if _, err := tx.Exec(ctx, `UPDATE product_variants SET stock_qty = stock_qty - $2 WHERE id = $1`, *item.VariantID, item.Qty); err != nil {
					return nil, mapErr(err)
				}
			}
			unitPrice = varPrice
			if varSuffix != "" {
				pSKU = pSKU + "-" + varSuffix
			}
		} else if trackStock {
			if pStock < item.Qty {
				return nil, domain.ErrInsufficientStock
			}
			if _, err := tx.Exec(ctx, `UPDATE products SET stock_qty = stock_qty - $2 WHERE id = $1`, item.ProductID, item.Qty); err != nil {
				return nil, mapErr(err)
			}
		}

		if hasVeg {
			if strings.EqualFold(item.DietPreference, "Non-Veg") {
				unitPrice += int64(nonVegDelta)
			} else if strings.EqualFold(item.DietPreference, "Veg") {
				unitPrice += int64(vegDelta)
			}
		}

		var addonTotal int64
		var addonDetails []map[string]any
		addonQtyMap := map[int64]int{}
		var addonOrder []int64
		for _, ao := range item.Addons {
			if ao.AddonID <= 0 || ao.Qty <= 0 {
				continue
			}
			if _, exists := addonQtyMap[ao.AddonID]; !exists {
				addonOrder = append(addonOrder, ao.AddonID)
			}
			addonQtyMap[ao.AddonID] += ao.Qty
		}
		if len(addonOrder) == 0 {
			for _, aid := range item.AddonIDs {
				if aid <= 0 {
					continue
				}
				if _, exists := addonQtyMap[aid]; !exists {
					addonOrder = append(addonOrder, aid)
				}
				addonQtyMap[aid] += 1
			}
		}
		for _, aid := range addonOrder {
			aqty := addonQtyMap[aid]
			var aName string
			var aPrice int64
			if aErr := tx.QueryRow(ctx, `SELECT name, price_paise FROM product_addons WHERE id = $1 AND is_active = TRUE`, aid).Scan(&aName, &aPrice); aErr == nil {
				lineAddon := aPrice * int64(aqty)
				addonTotal += lineAddon
				addonDetails = append(addonDetails, map[string]any{
					"id":          aid,
					"name":        aName,
					"qty":         aqty,
					"price_paise": aPrice,
				})
			}
		}
		lineTotal := (unitPrice * int64(item.Qty)) + addonTotal
		subtotalPaise += lineTotal

		var lineTax int64
		if gstRate > 0 {
			lineTax = lineTotal - int64(math.Round(float64(lineTotal)/(1.0+gstRate/100.0)))
		}
		totalTaxPaise += lineTax

		var commPct float64
		var payout int64 = lineTotal
		if sellerID != nil {
			_ = tx.QueryRow(ctx, `SELECT commission_percent::FLOAT8 FROM sellers WHERE id = $1`, *sellerID).Scan(&commPct)
			payout = lineTotal - int64(float64(lineTotal)*commPct/100.0)
		}

		pers := item.PersonalizationJSON
		if len(pers) == 0 {
			pers = json.RawMessage("{}")
		}
		addonsJSON, _ := json.Marshal(addonDetails)
		if len(addonDetails) == 0 {
			addonsJSON = json.RawMessage("[]")
		}

		builtItems = append(builtItems, builtItem{
			productID:       item.ProductID,
			variantID:       item.VariantID,
			sellerID:        sellerID,
			title:           pName,
			sku:             pSKU,
			itemType:        pType,
			qty:             item.Qty,
			unitPricePaise:  unitPrice,
			lineTotalPaise:  lineTotal,
			commissionPct:   commPct,
			sellerPayout:    payout,
			gstPaise:        lineTax,
			personalization: pers,
			addons:          addonsJSON,
		})
	}

	// Resolve / verify customer & blocked status before coupon/coin checks
	if in.CustomerID != nil {
		var isBlocked bool
		if cErr := tx.QueryRow(ctx, `SELECT is_blocked FROM customers WHERE id = $1 AND deleted_at IS NULL`, *in.CustomerID).Scan(&isBlocked); cErr == nil && isBlocked {
			return nil, domain.ErrForbidden
		}
	} else if rawPhone := strings.TrimSpace(in.RecipientPhone); rawPhone != "" {
		var digits strings.Builder
		for _, ch := range rawPhone {
			if ch >= '0' && ch <= '9' {
				digits.WriteRune(ch)
			}
		}
		cleanPhone := digits.String()
		if len(cleanPhone) >= 10 {
			cleanPhone = cleanPhone[len(cleanPhone)-10:]
		} else {
			cleanPhone = rawPhone
		}
		cleanName := strings.TrimSpace(in.RecipientName)
		var cid int64
		var isBlocked bool
		err = tx.QueryRow(ctx, `
			INSERT INTO customers (phone, name)
			VALUES ($1, $2)
			ON CONFLICT (phone) DO UPDATE SET
				name = COALESCE(NULLIF(customers.name, ''), EXCLUDED.name),
				updated_at = NOW()
			RETURNING id, is_blocked
		`, cleanPhone, cleanName).Scan(&cid, &isBlocked)
		if err != nil {
			return nil, mapErr(err)
		}
		if isBlocked {
			return nil, domain.ErrForbidden
		}
		_, _ = tx.Exec(ctx, `INSERT INTO coin_wallets (customer_id, balance_coins) VALUES ($1, 0) ON CONFLICT DO NOTHING`, cid)
		in.CustomerID = &cid
	}

	// 5. Coupon calculation (if provided)
	var couponCodePtr *string
	var couponDiscPaise int64
	var usedCouponID int64
	if code := strings.ToUpper(strings.TrimSpace(in.CouponCode)); code != "" {
		var couponID int64
		var discType string
		var discVal int
		var maxDisc *int64
		var minCart int64
		var totalLimit, usedCount, perUserLimit int
		var totalLimitNull *int
		var cityRaw []byte
		var validFrom, validUntil time.Time
		var active bool

		err = tx.QueryRow(ctx, `
			SELECT id, discount_type, discount_value, max_discount_paise, min_cart_paise,
			       applicable_city_ids, total_usage_limit, used_count, per_user_limit, valid_from, valid_until, is_active
			FROM coupons WHERE UPPER(code) = $1 FOR UPDATE
		`, code).Scan(&couponID, &discType, &discVal, &maxDisc, &minCart, &cityRaw, &totalLimitNull, &usedCount, &perUserLimit, &validFrom, &validUntil, &active)
		if err != nil || !active || now.Before(validFrom) || now.After(validUntil) || subtotalPaise < minCart {
			return nil, domain.ErrInvalidCoupon
		}
		var allowedCities []int64
		if len(cityRaw) > 0 && json.Unmarshal(cityRaw, &allowedCities) == nil && len(allowedCities) > 0 {
			matched := false
			for _, cid := range allowedCities {
				if cid == in.CityID {
					matched = true
					break
				}
			}
			if !matched {
				return nil, domain.ErrInvalidCoupon
			}
		}
		if totalLimitNull != nil {
			totalLimit = *totalLimitNull
			if usedCount >= totalLimit {
				return nil, domain.ErrInvalidCoupon
			}
		}
		if in.CustomerID != nil && perUserLimit > 0 {
			var custUsed int
			_ = tx.QueryRow(ctx, `SELECT COUNT(*) FROM coupon_usages WHERE coupon_id = $1 AND customer_id = $2`, couponID, *in.CustomerID).Scan(&custUsed)
			if custUsed >= perUserLimit {
				return nil, domain.ErrInvalidCoupon
			}
		}

		if discType == "flat" {
			couponDiscPaise = int64(discVal) * 100
		} else {
			couponDiscPaise = (subtotalPaise * int64(discVal)) / 100
			if maxDisc != nil && couponDiscPaise > *maxDisc {
				couponDiscPaise = *maxDisc
			}
		}
		if couponDiscPaise > subtotalPaise {
			couponDiscPaise = subtotalPaise
		}
		couponCodePtr = &code
		usedCouponID = couponID

		if _, err := tx.Exec(ctx, `UPDATE coupons SET used_count = used_count + 1 WHERE id = $1`, couponID); err != nil {
			return nil, mapErr(err)
		}
	}

	// 6. Coins redemption (if requested)
	var coinsDiscountPaise int64
	coinsRedeemed := 0
	if in.CoinsToRedeem > 0 && in.CustomerID != nil {
		var balance int
		err = tx.QueryRow(ctx, `SELECT balance_coins FROM coin_wallets WHERE customer_id = $1 FOR UPDATE`, *in.CustomerID).Scan(&balance)
		if err != nil || balance < in.CoinsToRedeem {
			return nil, domain.ErrInsufficientCoins
		}
		// 1 coin = Rs 1 = 100 paise
		coinsDiscountPaise = int64(in.CoinsToRedeem) * 100
		if maxCoins := subtotalPaise - couponDiscPaise; coinsDiscountPaise > maxCoins {
			coinsDiscountPaise = max(0, maxCoins)
			in.CoinsToRedeem = int(coinsDiscountPaise / 100)
		}
		coinsRedeemed = in.CoinsToRedeem
		if coinsRedeemed > 0 {
			if _, err := tx.Exec(ctx, `UPDATE coin_wallets SET balance_coins = balance_coins - $2, updated_at = NOW() WHERE customer_id = $1`, *in.CustomerID, coinsRedeemed); err != nil {
				return nil, mapErr(err)
			}
		}
	}

	if !hasExplicitDeliveryOverride && subtotalPaise >= 99900 {
		baseDeliveryPaise = 0
	}
	deliveryFeeTotal := baseDeliveryPaise + pincodeExtraPaise + blackoutSurgePaise
	totalPaise := max(0, subtotalPaise+deliveryFeeTotal+slotSurchargePaise-couponDiscPaise-coinsDiscountPaise)

	addrJSON := in.ShippingAddressJSON
	if len(addrJSON) == 0 {
		addrJSON = json.RawMessage("{}")
	}

	var randNum int64
	if rn, rErr := rand.Int(rand.Reader, big.NewInt(900000)); rErr == nil {
		randNum = rn.Int64() + 100000
	} else {
		randNum = now.UnixNano()%900000 + 100000
	}
	orderNumber := fmt.Sprintf("GL-%d-%06d", now.Year(), randNum)

	var orderID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO orders (
			order_number, customer_id, city_id, status, payment_status, payment_method, is_manual,
			delivery_date, slot_template_id, subtotal_paise, delivery_fee_paise, slot_surcharge_paise,
			coupon_code, coupon_discount_paise, coins_redeemed, coins_discount_paise, tax_gst_paise,
			total_paise, shipping_address_json, recipient_name, recipient_phone, internal_notes
		) VALUES (
			$1, $2, $3, 'placed', 'pending', $4, $5,
			$6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15,
			$16, $17, $18, $19, $20
		)
		RETURNING id
	`,
		orderNumber, in.CustomerID, in.CityID, in.PaymentMethod, in.IsManual,
		delivDate, in.SlotTemplateID, subtotalPaise, deliveryFeeTotal, slotSurchargePaise,
		couponCodePtr, couponDiscPaise, coinsRedeemed, coinsDiscountPaise, totalTaxPaise,
		totalPaise, addrJSON, in.RecipientName, in.RecipientPhone, in.InternalNotes,
	).Scan(&orderID)
	if err != nil {
		return nil, mapErr(err)
	}

	for _, bi := range builtItems {
		if _, err := tx.Exec(ctx, `
			INSERT INTO order_items (
				order_id, product_id, variant_id, seller_id, product_title_snapshot, sku_snapshot,
				item_type, qty, unit_price_paise, line_total_paise, commission_percent, seller_payout_paise,
				personalization_json, addons_json
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
		`,
			orderID, bi.productID, bi.variantID, bi.sellerID, bi.title, bi.sku,
			bi.itemType, bi.qty, bi.unitPricePaise, bi.lineTotalPaise, bi.commissionPct, bi.sellerPayout,
			bi.personalization, bi.addons,
		); err != nil {
			return nil, mapErr(err)
		}
	}

	if usedCouponID > 0 && in.CustomerID != nil {
		_, _ = tx.Exec(ctx, `
			INSERT INTO coupon_usages (coupon_id, customer_id, order_id, discount_paise)
			VALUES ($1, $2, $3, $4)
		`, usedCouponID, *in.CustomerID, orderID, couponDiscPaise)
	}

	if coinsRedeemed > 0 && in.CustomerID != nil {
		_, _ = tx.Exec(ctx, `
			INSERT INTO coin_transactions (customer_id, order_id, delta, tx_type, note)
			VALUES ($1, $2, $3, 'redeem', $4)
		`, *in.CustomerID, orderID, -coinsRedeemed, "Redeemed on "+orderNumber)
	}

	_, _ = tx.Exec(ctx, `
		INSERT INTO order_status_history (order_id, from_status, to_status, actor_type, reason)
		VALUES ($1, '', 'placed', 'system', 'Order placed')
	`, orderID)

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetOrderByIDOrNumber(ctx, &orderID, "")
}

func (r *OrderRepo) ListOrders(ctx context.Context, f domain.OrderListFilter) ([]domain.Order, int64, error) {
	where := []string{"o.deleted_at IS NULL"}
	args := []any{}
	idx := 1

	if f.Status != "" && f.Status != "all" {
		if f.Status == "processing" {
			where = append(where, "o.status IN ('confirmed', 'assigned', 'out_for_delivery')")
		} else {
			where = append(where, fmt.Sprintf("o.status = $%d", idx))
			args = append(args, f.Status)
			idx++
		}
	}
	if f.PaymentStatus != "" {
		where = append(where, fmt.Sprintf("o.payment_status = $%d", idx))
		args = append(args, f.PaymentStatus)
		idx++
	}
	if f.PaymentMethod != "" {
		where = append(where, fmt.Sprintf("o.payment_method = $%d", idx))
		args = append(args, f.PaymentMethod)
		idx++
	}
	if f.IsManual != nil {
		where = append(where, fmt.Sprintf("o.is_manual = $%d", idx))
		args = append(args, *f.IsManual)
		idx++
	}
	if f.CityID != nil {
		where = append(where, fmt.Sprintf("o.city_id = $%d", idx))
		args = append(args, *f.CityID)
		idx++
	}
	if f.CustomerID != nil {
		where = append(where, fmt.Sprintf("o.customer_id = $%d", idx))
		args = append(args, *f.CustomerID)
		idx++
	}
	if f.SellerID != nil {
		where = append(where, fmt.Sprintf("EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.seller_id = $%d)", idx))
		args = append(args, *f.SellerID)
		idx++
	}
	if f.CategoryID != nil {
		where = append(where, fmt.Sprintf("EXISTS (SELECT 1 FROM order_items oi JOIN product_categories pc ON pc.product_id = oi.product_id WHERE oi.order_id = o.id AND pc.category_id = $%d)", idx))
		args = append(args, *f.CategoryID)
		idx++
	}
	if f.DeliveryType != "" {
		where = append(where, fmt.Sprintf("EXISTS (SELECT 1 FROM order_items oi JOIN products p ON p.id = oi.product_id LEFT JOIN delivery_types dt ON dt.id = p.delivery_type_id WHERE oi.order_id = o.id AND (dt.slug = $%d OR oi.item_type = $%d))", idx, idx))
		args = append(args, f.DeliveryType)
		idx++
	}
	if f.DateFrom != "" {
		where = append(where, fmt.Sprintf("o.placed_at::DATE >= $%d::DATE", idx))
		args = append(args, f.DateFrom)
		idx++
	}
	if f.DateTo != "" {
		where = append(where, fmt.Sprintf("o.placed_at::DATE <= $%d::DATE", idx))
		args = append(args, f.DateTo)
		idx++
	}
	if f.Search != "" {
		where = append(where, fmt.Sprintf("(o.order_number ILIKE $%d OR o.recipient_name ILIKE $%d OR o.recipient_phone ILIKE $%d)", idx, idx, idx))
		args = append(args, "%"+f.Search+"%")
		idx++
	}

	whereSQL := strings.Join(where, " AND ")
	var total int64
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*)::BIGINT FROM orders o WHERE "+whereSQL, args...).Scan(&total); err != nil {
		return nil, 0, mapErr(err)
	}

	limit := f.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	page := f.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	orderBy := "o.placed_at DESC, o.id DESC"
	if f.SortBy == "total_desc" {
		orderBy = "o.total_paise DESC, o.id DESC"
	} else if f.SortBy == "delivery_asc" {
		orderBy = "o.delivery_date ASC NULLS LAST, o.id DESC"
	}

	query := fmt.Sprintf(`
		SELECT
			o.id, o.order_number, o.customer_id, o.city_id, c.name, o.status, o.payment_status,
			o.payment_method, o.is_manual,
			CASE WHEN o.delivery_date IS NOT NULL THEN TO_CHAR(o.delivery_date, 'YYYY-MM-DD') ELSE NULL END,
			o.slot_template_id, COALESCE(ts.label, ''),
			o.subtotal_paise, o.delivery_fee_paise, o.slot_surcharge_paise, o.coupon_code,
			o.coupon_discount_paise, o.coins_redeemed, o.coins_discount_paise, o.tax_gst_paise,
			o.total_paise, o.cancellation_fee_paise, o.shipping_address_json,
			o.recipient_name, o.recipient_phone, o.tracking_id, o.internal_notes,
			o.placed_at, o.created_at, o.updated_at
		FROM orders o
		JOIN cities c ON c.id = o.city_id
		LEFT JOIN time_slot_templates ts ON ts.id = o.slot_template_id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereSQL, orderBy, idx, idx+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, mapErr(err)
	}
	defer rows.Close()

	out := []domain.Order{}
	for rows.Next() {
		var o domain.Order
		if err := rows.Scan(
			&o.ID, &o.OrderNumber, &o.CustomerID, &o.CityID, &o.CityName, &o.Status, &o.PaymentStatus,
			&o.PaymentMethod, &o.IsManual, &o.DeliveryDate, &o.SlotTemplateID, &o.SlotLabel,
			&o.SubtotalPaise, &o.DeliveryFeePaise, &o.SlotSurchargePaise, &o.CouponCode,
			&o.CouponDiscountPaise, &o.CoinsRedeemed, &o.CoinsDiscountPaise, &o.TaxGSTPaise,
			&o.TotalPaise, &o.CancellationFeePaise, &o.ShippingAddressJSON,
			&o.RecipientName, &o.RecipientPhone, &o.TrackingID, &o.InternalNotes,
			&o.PlacedAt, &o.CreatedAt, &o.UpdatedAt,
		); err != nil {
			return nil, 0, mapErr(err)
		}
		out = append(out, o)
	}
	return out, total, nil
}

func (r *OrderRepo) GetOrderByIDOrNumber(ctx context.Context, id *int64, orderNum string) (*domain.Order, error) {
	cond := "o.order_number = $1"
	arg := any(orderNum)
	if id != nil {
		cond = "o.id = $1"
		arg = *id
	}

	var o domain.Order
	err := r.pool.QueryRow(ctx, `
		SELECT
			o.id, o.order_number, o.customer_id, o.city_id, c.name, o.status, o.payment_status,
			o.payment_method, o.is_manual,
			CASE WHEN o.delivery_date IS NOT NULL THEN TO_CHAR(o.delivery_date, 'YYYY-MM-DD') ELSE NULL END,
			o.slot_template_id, COALESCE(ts.label, ''),
			o.subtotal_paise, o.delivery_fee_paise, o.slot_surcharge_paise, o.coupon_code,
			o.coupon_discount_paise, o.coins_redeemed, o.coins_discount_paise, o.tax_gst_paise,
			o.total_paise, o.cancellation_fee_paise, o.shipping_address_json,
			o.recipient_name, o.recipient_phone, o.tracking_id, o.internal_notes,
			o.placed_at, o.created_at, o.updated_at
		FROM orders o
		JOIN cities c ON c.id = o.city_id
		LEFT JOIN time_slot_templates ts ON ts.id = o.slot_template_id
		WHERE `+cond+` AND o.deleted_at IS NULL
		LIMIT 1
	`, arg).Scan(
		&o.ID, &o.OrderNumber, &o.CustomerID, &o.CityID, &o.CityName, &o.Status, &o.PaymentStatus,
		&o.PaymentMethod, &o.IsManual, &o.DeliveryDate, &o.SlotTemplateID, &o.SlotLabel,
		&o.SubtotalPaise, &o.DeliveryFeePaise, &o.SlotSurchargePaise, &o.CouponCode,
		&o.CouponDiscountPaise, &o.CoinsRedeemed, &o.CoinsDiscountPaise, &o.TaxGSTPaise,
		&o.TotalPaise, &o.CancellationFeePaise, &o.ShippingAddressJSON,
		&o.RecipientName, &o.RecipientPhone, &o.TrackingID, &o.InternalNotes,
		&o.PlacedAt, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		return nil, mapErr(err)
	}

	iRows, err := r.pool.Query(ctx, `
		SELECT id, order_id, product_id, variant_id, seller_id, product_title_snapshot, sku_snapshot,
		       item_type, qty, unit_price_paise, line_total_paise, commission_percent::FLOAT8,
		       seller_payout_paise, personalization_json, addons_json
		FROM order_items WHERE order_id = $1 ORDER BY id ASC
	`, o.ID)
	if err == nil {
		defer iRows.Close()
		for iRows.Next() {
			var it domain.OrderItem
			if iRows.Scan(
				&it.ID, &it.OrderID, &it.ProductID, &it.VariantID, &it.SellerID, &it.ProductTitle,
				&it.SKUSnapshot, &it.ItemType, &it.Qty, &it.UnitPricePaise, &it.LineTotalPaise,
				&it.CommissionPercent, &it.SellerPayoutPaise, &it.PersonalizationJSON, &it.AddonsJSON,
			) == nil {
				o.Items = append(o.Items, it)
			}
		}
	}

	hRows, err := r.pool.Query(ctx, `SELECT id, order_id, from_status, to_status, actor_type, actor_id, reason, created_at FROM order_status_history WHERE order_id = $1 ORDER BY id ASC`, o.ID)
	if err == nil {
		defer hRows.Close()
		for hRows.Next() {
			var h domain.OrderStatusHistoryEntry
			if hRows.Scan(&h.ID, &h.OrderID, &h.FromStatus, &h.ToStatus, &h.ActorType, &h.ActorID, &h.Reason, &h.CreatedAt) == nil {
				o.History = append(o.History, h)
			}
		}
	}

	aRows, err := r.pool.Query(ctx, `SELECT id, order_id, decorator_team_id, delivery_partner_name, delivery_partner_phone, assigned_by_admin_id, assigned_at FROM order_assignments WHERE order_id = $1 ORDER BY id DESC`, o.ID)
	if err == nil {
		defer aRows.Close()
		for aRows.Next() {
			var a domain.OrderAssignment
			if aRows.Scan(&a.ID, &a.OrderID, &a.DecoratorTeamID, &a.DeliveryPartnerName, &a.DeliveryPartnerPhone, &a.AssignedByAdminID, &a.AssignedAt) == nil {
				o.Assignments = append(o.Assignments, a)
			}
		}
	}

	return &o, nil
}

func (r *OrderRepo) UpdateOrderStatusTx(ctx context.Context, orderID int64, toStatus, actorType string, actorID *int64, reason string, cancelCutoffHours int, cancelFeePercent int) (*domain.Order, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var currentStatus, orderNum string
	var deliveryDate *time.Time
	var totalPaise, cityID int64
	var slotID, customerID *int64
	var coinsRedeemed int
	var couponCode *string
	err = tx.QueryRow(ctx, `
		SELECT status, order_number, delivery_date, total_paise, city_id, slot_template_id, customer_id, coins_redeemed, coupon_code
		FROM orders WHERE id = $1 AND deleted_at IS NULL FOR UPDATE
	`, orderID).Scan(&currentStatus, &orderNum, &deliveryDate, &totalPaise, &cityID, &slotID, &customerID, &coinsRedeemed, &couponCode)
	if err != nil {
		return nil, mapErr(err)
	}

	if !domain.CanTransitionOrder(currentStatus, toStatus) {
		return nil, domain.ErrInvalidTransition
	}

	var cancelFeePaise int64
	if toStatus == domain.OrderStatusCancelled {
		var hasDecor bool
		_ = tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM order_items WHERE order_id = $1 AND item_type = 'decoration_package')`, orderID).Scan(&hasDecor)
		if hasDecor && deliveryDate != nil {
			loc, locErr := time.LoadLocation("Asia/Kolkata")
			if locErr != nil {
				loc = time.Local
			}
			slotHour, slotMin := 9, 0
			if slotID != nil {
				var stStr string
				if tx.QueryRow(ctx, `SELECT TO_CHAR(start_time, 'HH24:MI') FROM time_slot_templates WHERE id = $1`, *slotID).Scan(&stStr) == nil {
					if parsedSt, pErr := time.Parse("15:04", stStr); pErr == nil {
						slotHour, slotMin = parsedSt.Hour(), parsedSt.Minute()
					}
				}
			}
			eventStart := time.Date(deliveryDate.Year(), deliveryDate.Month(), deliveryDate.Day(), slotHour, slotMin, 0, 0, loc)
			hoursUntil := time.Until(eventStart).Hours()
			if hoursUntil < float64(cancelCutoffHours) && actorType != "admin" {
				return nil, domain.ErrCancelNotAllowed
			}
			cancelFeePaise = (totalPaise * int64(cancelFeePercent)) / 100
		}

		if slotID != nil && deliveryDate != nil {
			_, _ = tx.Exec(ctx, `
				UPDATE slot_capacity_ledger SET reserved_count = GREATEST(0, reserved_count - 1)
				WHERE city_id = $1 AND slot_template_id = $2 AND service_date = $3
			`, cityID, *slotID, *deliveryDate)
		}

		// Restore tracked product / variant inventory on cancellation
		if itemRows, qErr := tx.Query(ctx, `
			SELECT oi.product_id, oi.variant_id, oi.qty, p.track_stock
			FROM order_items oi JOIN products p ON p.id = oi.product_id
			WHERE oi.order_id = $1
		`, orderID); qErr == nil {
			type stockRestore struct {
				prodID int64
				varID  *int64
				qty    int
				track  bool
			}
			var restores []stockRestore
			for itemRows.Next() {
				var sr stockRestore
				if itemRows.Scan(&sr.prodID, &sr.varID, &sr.qty, &sr.track) == nil {
					restores = append(restores, sr)
				}
			}
			itemRows.Close()
			for _, sr := range restores {
				if !sr.track || sr.qty <= 0 {
					continue
				}
				if sr.varID != nil {
					_, _ = tx.Exec(ctx, `UPDATE product_variants SET stock_qty = stock_qty + $2 WHERE id = $1`, *sr.varID, sr.qty)
				} else {
					_, _ = tx.Exec(ctx, `UPDATE products SET stock_qty = stock_qty + $2 WHERE id = $1`, sr.prodID, sr.qty)
				}
			}
		}

		// Return redeemed coins if the order was cancelled prior to completion
		if coinsRedeemed > 0 && customerID != nil {
			_, _ = tx.Exec(ctx, `
				UPDATE coin_wallets SET balance_coins = balance_coins + $2, updated_at = NOW()
				WHERE customer_id = $1
			`, *customerID, coinsRedeemed)
			_, _ = tx.Exec(ctx, `
				INSERT INTO coin_transactions (customer_id, order_id, delta, tx_type, note)
				VALUES ($1, $2, $3, 'admin_adjust', $4)
			`, *customerID, orderID, coinsRedeemed, "Redeemed coins returned on cancellation of "+orderNum)
		}

		// Release single-use coupon reservation on cancellation
		if couponCode != nil && *couponCode != "" {
			_, _ = tx.Exec(ctx, `UPDATE coupons SET used_count = GREATEST(0, used_count - 1) WHERE UPPER(code) = $1`, strings.ToUpper(*couponCode))
			_, _ = tx.Exec(ctx, `DELETE FROM coupon_usages WHERE order_id = $1`, orderID)
		}
	}

	if _, err := tx.Exec(ctx, `
		UPDATE orders SET status = $2, cancellation_fee_paise = GREATEST(cancellation_fee_paise, $3)
		WHERE id = $1
	`, orderID, toStatus, cancelFeePaise); err != nil {
		return nil, mapErr(err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO order_status_history (order_id, from_status, to_status, actor_type, actor_id, reason)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, orderID, currentStatus, toStatus, actorType, actorID, reason); err != nil {
		return nil, mapErr(err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetOrderByIDOrNumber(ctx, &orderID, "")
}

func (r *OrderRepo) AssignOrder(ctx context.Context, orderID int64, decoratorTeamID *int64, partnerName, partnerPhone string, adminID *int64) (*domain.OrderAssignment, error) {
	var a domain.OrderAssignment
	err := r.pool.QueryRow(ctx, `
		INSERT INTO order_assignments (order_id, decorator_team_id, delivery_partner_name, delivery_partner_phone, assigned_by_admin_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, order_id, decorator_team_id, delivery_partner_name, delivery_partner_phone, assigned_by_admin_id, assigned_at
	`, orderID, decoratorTeamID, partnerName, partnerPhone, adminID).Scan(
		&a.ID, &a.OrderID, &a.DecoratorTeamID, &a.DeliveryPartnerName, &a.DeliveryPartnerPhone, &a.AssignedByAdminID, &a.AssignedAt,
	)
	return &a, mapErr(err)
}

func (r *OrderRepo) UpdateOrderTrackingNotes(ctx context.Context, orderID int64, trackingID, internalNotes string) (*domain.Order, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE orders SET
			tracking_id = COALESCE(NULLIF($2, ''), tracking_id),
			internal_notes = $3
		WHERE id = $1 AND deleted_at IS NULL
	`, orderID, trackingID, internalNotes)
	if err != nil {
		return nil, mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.ErrNotFound
	}
	return r.GetOrderByIDOrNumber(ctx, &orderID, "")
}

func (r *OrderRepo) GetCalendarBookings(ctx context.Context, month string, cityID *int64) ([]map[string]any, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT TO_CHAR(o.delivery_date, 'YYYY-MM-DD') AS d,
		       COUNT(*)::INT,
		       COALESCE(SUM(o.total_paise), 0)::BIGINT,
		       JSON_AGG(JSON_BUILD_OBJECT('id', o.id, 'order_number', o.order_number, 'recipient', o.recipient_name, 'status', o.status, 'city', c.name, 'slot', COALESCE(ts.label, '')))
		FROM orders o
		JOIN cities c ON c.id = o.city_id
		LEFT JOIN time_slot_templates ts ON ts.id = o.slot_template_id
		WHERE o.deleted_at IS NULL
		  AND o.delivery_date IS NOT NULL
		  AND TO_CHAR(o.delivery_date, 'YYYY-MM') = $1
		  AND ($2::BIGINT IS NULL OR o.city_id = $2)
		GROUP BY o.delivery_date
		ORDER BY o.delivery_date ASC
	`, month, cityID)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var date string
		var cnt int
		var rev int64
		var ordersRaw json.RawMessage
		if rows.Scan(&date, &cnt, &rev, &ordersRaw) == nil {
			out = append(out, map[string]any{
				"date":          date,
				"count":         cnt,
				"revenue_paise": rev,
				"orders":        ordersRaw,
			})
		}
	}
	return out, nil
}

func (r *OrderRepo) ListOrderUploads(ctx context.Context, sellerID *int64, page, limit int) ([]domain.OrderUploadEntry, int64, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 25
	}
	where := []string{
		"o.deleted_at IS NULL",
		"oi.personalization_json IS NOT NULL",
		"oi.personalization_json::TEXT <> '{}'",
		"oi.personalization_json::TEXT <> 'null'",
	}
	args := []any{}
	idx := 1
	if sellerID != nil {
		where = append(where, fmt.Sprintf("oi.seller_id = $%d", idx))
		args = append(args, *sellerID)
		idx++
	}
	wSQL := strings.Join(where, " AND ")
	var total int64
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*)::BIGINT FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE `+wSQL, args...).Scan(&total); err != nil {
		return nil, 0, mapErr(err)
	}
	args = append(args, limit, (page-1)*limit)
	rows, err := r.pool.Query(ctx, fmt.Sprintf(`
		SELECT oi.id, o.id, o.order_number, o.recipient_name, o.recipient_phone,
		       CASE WHEN o.delivery_date IS NOT NULL THEN TO_CHAR(o.delivery_date,'YYYY-MM-DD') ELSE NULL END,
		       o.status, oi.product_id, oi.product_title_snapshot, oi.personalization_json, o.placed_at
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		WHERE %s
		ORDER BY oi.id DESC
		LIMIT $%d OFFSET $%d
	`, wSQL, idx, idx+1), args...)
	if err != nil {
		return nil, 0, mapErr(err)
	}
	defer rows.Close()
	out := []domain.OrderUploadEntry{}
	for rows.Next() {
		var u domain.OrderUploadEntry
		if err := rows.Scan(&u.ItemID, &u.OrderID, &u.OrderNumber, &u.RecipientName, &u.RecipientPhone,
			&u.DeliveryDate, &u.Status, &u.ProductID, &u.ProductTitle, &u.PersonalizationJSON, &u.PlacedAt); err != nil {
			return nil, 0, mapErr(err)
		}
		out = append(out, u)
	}
	return out, total, nil
}

func (r *OrderRepo) ListPaymentLinks(ctx context.Context, page, limit int) ([]domain.PaymentLink, int64, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	var total int64
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*)::BIGINT FROM payment_links`).Scan(&total)
	rows, err := r.pool.Query(ctx, `
		SELECT id, order_id, customer_phone, amount_paise, short_url, status, expires_at, created_by_admin_id, created_at
		FROM payment_links ORDER BY id DESC LIMIT $1 OFFSET $2
	`, limit, (page-1)*limit)
	if err != nil {
		return nil, 0, mapErr(err)
	}
	defer rows.Close()
	out := []domain.PaymentLink{}
	for rows.Next() {
		var pl domain.PaymentLink
		if rows.Scan(&pl.ID, &pl.OrderID, &pl.CustomerPhone, &pl.AmountPaise, &pl.ShortURL, &pl.Status, &pl.ExpiresAt, &pl.CreatedByAdminID, &pl.CreatedAt) == nil {
			out = append(out, pl)
		}
	}
	return out, total, nil
}

func (r *OrderRepo) CreatePaymentLink(ctx context.Context, link *domain.PaymentLink) (*domain.PaymentLink, error) {
	err := r.pool.QueryRow(ctx, `
		INSERT INTO payment_links (order_id, customer_phone, amount_paise, short_url, status, expires_at, created_by_admin_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`, link.OrderID, link.CustomerPhone, link.AmountPaise, link.ShortURL, link.Status, link.ExpiresAt, link.CreatedByAdminID).Scan(&link.ID, &link.CreatedAt)
	return link, mapErr(err)
}

func (r *OrderRepo) ListInvoices(ctx context.Context, page, limit int) ([]domain.Invoice, int64, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	var total int64
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*)::BIGINT FROM invoices`).Scan(&total)
	rows, err := r.pool.Query(ctx, `
		SELECT i.id, i.order_id, o.order_number, i.invoice_number, i.gstin_seller, i.gst_breakup_json, i.pdf_url, i.generated_at
		FROM invoices i
		JOIN orders o ON o.id = i.order_id
		ORDER BY i.id DESC LIMIT $1 OFFSET $2
	`, limit, (page-1)*limit)
	if err != nil {
		return nil, 0, mapErr(err)
	}
	defer rows.Close()
	out := []domain.Invoice{}
	for rows.Next() {
		var inv domain.Invoice
		if rows.Scan(&inv.ID, &inv.OrderID, &inv.OrderNumber, &inv.InvoiceNumber, &inv.GSTINSeller, &inv.GSTBreakup, &inv.PDFURL, &inv.GeneratedAt) == nil {
			out = append(out, inv)
		}
	}
	return out, total, nil
}

func (r *OrderRepo) GetOrGenerateInvoice(ctx context.Context, orderID int64, gstin string) (*domain.Invoice, error) {
	var inv domain.Invoice
	err := r.pool.QueryRow(ctx, `
		SELECT i.id, i.order_id, o.order_number, i.invoice_number, i.gstin_seller, i.gst_breakup_json, i.pdf_url, i.generated_at
		FROM invoices i JOIN orders o ON o.id = i.order_id
		WHERE i.order_id = $1
	`, orderID).Scan(&inv.ID, &inv.OrderID, &inv.OrderNumber, &inv.InvoiceNumber, &inv.GSTINSeller, &inv.GSTBreakup, &inv.PDFURL, &inv.GeneratedAt)
	if err == nil {
		return &inv, nil
	}

	ord, oErr := r.GetOrderByIDOrNumber(ctx, &orderID, "")
	if oErr != nil {
		return nil, oErr
	}
	invNum := fmt.Sprintf("INV-%s", ord.OrderNumber)
	cgst := ord.TaxGSTPaise / 2
	sgst := ord.TaxGSTPaise - cgst
	breakup, _ := json.Marshal(map[string]any{
		"subtotal_paise": ord.SubtotalPaise,
		"cgst_paise":     cgst,
		"sgst_paise":     sgst,
		"total_paise":    ord.TotalPaise,
	})
	pdfURL := fmt.Sprintf("/api/v1/admin/invoices/%d/pdf", ord.ID)
	err = r.pool.QueryRow(ctx, `
		INSERT INTO invoices (order_id, invoice_number, gstin_seller, gst_breakup_json, pdf_url)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, generated_at
	`, ord.ID, invNum, gstin, breakup, pdfURL).Scan(&inv.ID, &inv.GeneratedAt)
	if err != nil {
		return nil, mapErr(err)
	}
	inv.OrderID = ord.ID
	inv.OrderNumber = ord.OrderNumber
	inv.InvoiceNumber = invNum
	inv.GSTINSeller = gstin
	inv.GSTBreakup = breakup
	inv.PDFURL = pdfURL
	return &inv, nil
}
