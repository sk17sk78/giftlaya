package repository

import (
	"context"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DashboardRepo struct {
	pool *pgxpool.Pool
}

func NewDashboardRepo(pool *pgxpool.Pool) *DashboardRepo {
	return &DashboardRepo{pool: pool}
}

func (r *DashboardRepo) GetStats(ctx context.Context, from, to time.Time) (*domain.DashboardStats, error) {
	stats := &domain.DashboardStats{
		StatusCounts:  []domain.StatusCount{},
		TopProducts:   []domain.TopProductStat{},
		TopCities:     []domain.TopCityStat{},
		LowStockItems: []domain.LowStockItem{},
		RevenueSeries: []domain.DailyRevenuePoint{},
	}

	err := r.pool.QueryRow(ctx, `
		SELECT
			COALESCE(COUNT(*) FILTER (WHERE placed_at::DATE = CURRENT_DATE), 0),
			COALESCE(SUM(total_paise) FILTER (WHERE placed_at::DATE = CURRENT_DATE AND status NOT IN ('cancelled','refunded')), 0),
			COALESCE(COUNT(*) FILTER (WHERE placed_at >= $1 AND placed_at <= $2), 0),
			COALESCE(SUM(total_paise) FILTER (WHERE placed_at >= $1 AND placed_at <= $2 AND status NOT IN ('cancelled','refunded')), 0)
		FROM orders
		WHERE deleted_at IS NULL
	`, from, to).Scan(&stats.TodayOrders, &stats.TodayRevenue, &stats.TotalOrders, &stats.TotalRevenue)
	if err != nil {
		return nil, mapErr(err)
	}

	// Status breakdown
	sRows, err := r.pool.Query(ctx, `
		SELECT status, COUNT(*)::BIGINT
		FROM orders
		WHERE deleted_at IS NULL AND placed_at >= $1 AND placed_at <= $2
		GROUP BY status
		ORDER BY COUNT(*) DESC
	`, from, to)
	if err == nil {
		defer sRows.Close()
		for sRows.Next() {
			var sc domain.StatusCount
			if scanErr := sRows.Scan(&sc.Status, &sc.Count); scanErr == nil {
				stats.StatusCounts = append(stats.StatusCounts, sc)
			}
		}
	}

	// Top 5 products
	pRows, err := r.pool.Query(ctx, `
		SELECT oi.product_id, oi.product_title_snapshot, oi.sku_snapshot, SUM(oi.qty)::BIGINT, SUM(oi.line_total_paise)::BIGINT
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		WHERE o.deleted_at IS NULL AND o.placed_at >= $1 AND o.placed_at <= $2
		  AND o.status NOT IN ('cancelled', 'refunded')
		GROUP BY oi.product_id, oi.product_title_snapshot, oi.sku_snapshot
		ORDER BY SUM(oi.qty) DESC
		LIMIT 5
	`, from, to)
	if err == nil {
		defer pRows.Close()
		for pRows.Next() {
			var tp domain.TopProductStat
			if scanErr := pRows.Scan(&tp.ProductID, &tp.Title, &tp.SKU, &tp.UnitsSold, &tp.Revenue); scanErr == nil {
				stats.TopProducts = append(stats.TopProducts, tp)
			}
		}
	}

	// Top 5 cities
	cRows, err := r.pool.Query(ctx, `
		SELECT c.id, c.name, COUNT(o.id)::BIGINT, COALESCE(SUM(o.total_paise), 0)::BIGINT
		FROM orders o
		JOIN cities c ON c.id = o.city_id
		WHERE o.deleted_at IS NULL AND o.placed_at >= $1 AND o.placed_at <= $2
		  AND o.status NOT IN ('cancelled', 'refunded')
		GROUP BY c.id, c.name
		ORDER BY COUNT(o.id) DESC
		LIMIT 5
	`, from, to)
	if err == nil {
		defer cRows.Close()
		for cRows.Next() {
			var tc domain.TopCityStat
			if scanErr := cRows.Scan(&tc.CityID, &tc.Name, &tc.Orders, &tc.Revenue); scanErr == nil {
				stats.TopCities = append(stats.TopCities, tc)
			}
		}
	}

	// Low stock products
	lRows, err := r.pool.Query(ctx, `
		SELECT id, name, sku, stock_qty
		FROM products
		WHERE deleted_at IS NULL AND track_stock = TRUE AND status = 'published' AND stock_qty <= 10
		ORDER BY stock_qty ASC
		LIMIT 10
	`)
	if err == nil {
		defer lRows.Close()
		for lRows.Next() {
			var ls domain.LowStockItem
			if scanErr := lRows.Scan(&ls.ProductID, &ls.Name, &ls.SKU, &ls.StockQty); scanErr == nil {
				stats.LowStockItems = append(stats.LowStockItems, ls)
			}
		}
	}

	// Daily revenue series
	dRows, err := r.pool.Query(ctx, `
		SELECT TO_CHAR(placed_at::DATE, 'YYYY-MM-DD') AS d,
			   COUNT(*)::BIGINT,
			   COALESCE(SUM(total_paise) FILTER (WHERE status NOT IN ('cancelled','refunded')), 0)::BIGINT
		FROM orders
		WHERE deleted_at IS NULL AND placed_at >= $1 AND placed_at <= $2
		GROUP BY placed_at::DATE
		ORDER BY placed_at::DATE ASC
	`, from, to)
	if err == nil {
		defer dRows.Close()
		for dRows.Next() {
			var pt domain.DailyRevenuePoint
			if scanErr := dRows.Scan(&pt.Date, &pt.Orders, &pt.Revenue); scanErr == nil {
				stats.RevenueSeries = append(stats.RevenueSeries, pt)
			}
		}
	}

	return stats, nil
}

