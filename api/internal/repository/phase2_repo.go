package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Phase2Repo struct {
	pool *pgxpool.Pool
}

func NewPhase2Repo(pool *pgxpool.Pool) *Phase2Repo {
	return &Phase2Repo{pool: pool}
}

// ---------- Hero Banners & Homepage Sections ----------

func (r *Phase2Repo) ListHeroBanners(ctx context.Context, activeOnly bool) ([]domain.HeroBanner, error) {
	q := `
		SELECT id, title, href, desktop_image_url, mobile_image_url, starts_at, ends_at,
		       sort_order, is_active, created_at, updated_at
		FROM hero_banners
	`
	if activeOnly {
		q += ` WHERE is_active = TRUE AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW())`
	}
	q += ` ORDER BY sort_order ASC, id ASC`

	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.HeroBanner{}
	for rows.Next() {
		var b domain.HeroBanner
		if err := rows.Scan(
			&b.ID, &b.Title, &b.Href, &b.DesktopImageURL, &b.MobileImageURL,
			&b.StartsAt, &b.EndsAt, &b.SortOrder, &b.IsActive, &b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, b)
	}
	return out, nil
}

func (r *Phase2Repo) SaveHeroBanner(ctx context.Context, b *domain.HeroBanner) (*domain.HeroBanner, error) {
	var out domain.HeroBanner
	var err error
	if b.ID > 0 {
		err = r.pool.QueryRow(ctx, `
			UPDATE hero_banners
			SET title = $2, href = $3, desktop_image_url = $4, mobile_image_url = $5,
			    starts_at = $6, ends_at = $7, sort_order = $8, is_active = $9
			WHERE id = $1
			RETURNING id, title, href, desktop_image_url, mobile_image_url, starts_at, ends_at, sort_order, is_active, created_at, updated_at
		`, b.ID, b.Title, b.Href, b.DesktopImageURL, b.MobileImageURL, b.StartsAt, b.EndsAt, b.SortOrder, b.IsActive).Scan(
			&out.ID, &out.Title, &out.Href, &out.DesktopImageURL, &out.MobileImageURL,
			&out.StartsAt, &out.EndsAt, &out.SortOrder, &out.IsActive, &out.CreatedAt, &out.UpdatedAt,
		)
	} else {
		err = r.pool.QueryRow(ctx, `
			INSERT INTO hero_banners (title, href, desktop_image_url, mobile_image_url, starts_at, ends_at, sort_order, is_active)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
			RETURNING id, title, href, desktop_image_url, mobile_image_url, starts_at, ends_at, sort_order, is_active, created_at, updated_at
		`, b.Title, b.Href, b.DesktopImageURL, b.MobileImageURL, b.StartsAt, b.EndsAt, b.SortOrder, b.IsActive).Scan(
			&out.ID, &out.Title, &out.Href, &out.DesktopImageURL, &out.MobileImageURL,
			&out.StartsAt, &out.EndsAt, &out.SortOrder, &out.IsActive, &out.CreatedAt, &out.UpdatedAt,
		)
	}
	return &out, mapErr(err)
}

func (r *Phase2Repo) DeleteHeroBanner(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM hero_banners WHERE id = $1`, id)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Phase2Repo) ListHomepageSections(ctx context.Context, activeOnly bool) ([]domain.HomepageSection, error) {
	q := `SELECT id, section_key, section_type, title, subtitle, slider_enabled, rule_config_json, sort_order, is_active, updated_at FROM homepage_sections`
	if activeOnly {
		q += ` WHERE is_active = TRUE`
	}
	q += ` ORDER BY sort_order ASC, id ASC`

	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.HomepageSection{}
	for rows.Next() {
		var s domain.HomepageSection
		if err := rows.Scan(
			&s.ID, &s.SectionKey, &s.SectionType, &s.Title, &s.Subtitle,
			&s.SliderEnabled, &s.RuleConfigJSON, &s.SortOrder, &s.IsActive, &s.UpdatedAt,
		); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, s)
	}
	return out, nil
}

func (r *Phase2Repo) SaveHomepageSection(ctx context.Context, s *domain.HomepageSection) (*domain.HomepageSection, error) {
	cfg := s.RuleConfigJSON
	if len(cfg) == 0 {
		cfg = json.RawMessage("{}")
	}
	var out domain.HomepageSection
	var err error
	if s.ID > 0 {
		err = r.pool.QueryRow(ctx, `
			UPDATE homepage_sections
			SET section_key = $2, section_type = $3, title = $4, subtitle = $5,
			    slider_enabled = $6, rule_config_json = $7, sort_order = $8, is_active = $9
			WHERE id = $1
			RETURNING id, section_key, section_type, title, subtitle, slider_enabled, rule_config_json, sort_order, is_active, updated_at
		`, s.ID, s.SectionKey, s.SectionType, s.Title, s.Subtitle, s.SliderEnabled, cfg, s.SortOrder, s.IsActive).Scan(
			&out.ID, &out.SectionKey, &out.SectionType, &out.Title, &out.Subtitle,
			&out.SliderEnabled, &out.RuleConfigJSON, &out.SortOrder, &out.IsActive, &out.UpdatedAt,
		)
	} else {
		err = r.pool.QueryRow(ctx, `
			INSERT INTO homepage_sections (section_key, section_type, title, subtitle, slider_enabled, rule_config_json, sort_order, is_active)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
			ON CONFLICT (section_key) DO UPDATE SET
			  section_type = EXCLUDED.section_type, title = EXCLUDED.title, subtitle = EXCLUDED.subtitle,
			  slider_enabled = EXCLUDED.slider_enabled, rule_config_json = EXCLUDED.rule_config_json,
			  sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active
			RETURNING id, section_key, section_type, title, subtitle, slider_enabled, rule_config_json, sort_order, is_active, updated_at
		`, s.SectionKey, s.SectionType, s.Title, s.Subtitle, s.SliderEnabled, cfg, s.SortOrder, s.IsActive).Scan(
			&out.ID, &out.SectionKey, &out.SectionType, &out.Title, &out.Subtitle,
			&out.SliderEnabled, &out.RuleConfigJSON, &out.SortOrder, &out.IsActive, &out.UpdatedAt,
		)
	}
	return &out, mapErr(err)
}

func (r *Phase2Repo) DeleteHomepageSection(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM homepage_sections WHERE id = $1`, id)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// ---------- Geo, Cities, Pincodes, Time Slots, Blackout Dates, Decorators, Presets ----------

func (r *Phase2Repo) ListStates(ctx context.Context) ([]domain.State, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name, slug, is_active, created_at FROM states ORDER BY name ASC`)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.State{}
	for rows.Next() {
		var s domain.State
		if err := rows.Scan(&s.ID, &s.Name, &s.Slug, &s.IsActive, &s.CreatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, s)
	}
	return out, nil
}

func (r *Phase2Repo) SaveState(ctx context.Context, s *domain.State) (*domain.State, error) {
	var out domain.State
	var err error
	if s.ID > 0 {
		err = r.pool.QueryRow(ctx, `UPDATE states SET name=$2, slug=$3, is_active=$4 WHERE id=$1 RETURNING id, name, slug, is_active, created_at`,
			s.ID, s.Name, s.Slug, s.IsActive).Scan(&out.ID, &out.Name, &out.Slug, &out.IsActive, &out.CreatedAt)
	} else {
		err = r.pool.QueryRow(ctx, `INSERT INTO states (name, slug, is_active) VALUES ($1,$2,$3) RETURNING id, name, slug, is_active, created_at`,
			s.Name, s.Slug, s.IsActive).Scan(&out.ID, &out.Name, &out.Slug, &out.IsActive, &out.CreatedAt)
	}
	return &out, mapErr(err)
}

func (r *Phase2Repo) ListCities(ctx context.Context, search string, activeOnly bool) ([]domain.City, error) {
	where := []string{"1=1"}
	args := []any{}
	if search != "" {
		args = append(args, "%"+search+"%")
		where = append(where, fmt.Sprintf("(c.name ILIKE $%d OR c.slug ILIKE $%d)", len(args), len(args)))
	}
	if activeOnly {
		where = append(where, "c.is_active = TRUE")
	}
	rows, err := r.pool.Query(ctx, `
		SELECT c.id, c.state_id, COALESCE(st.name,''), c.name, c.slug, c.is_popular, c.landmark_key,
		       c.base_delivery_charge_paise, TO_CHAR(c.same_day_cutoff_time, 'HH24:MI'),
		       c.midnight_available, c.sort_order, c.is_active, c.created_at
		FROM cities c LEFT JOIN states st ON st.id = c.state_id
		WHERE `+strings.Join(where, " AND ")+`
		ORDER BY c.is_popular DESC, c.sort_order ASC, c.name ASC
	`, args...)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.City{}
	for rows.Next() {
		var c domain.City
		if err := rows.Scan(
			&c.ID, &c.StateID, &c.StateName, &c.Name, &c.Slug, &c.IsPopular, &c.LandmarkKey,
			&c.BaseDeliveryChargePaise, &c.SameDayCutoffTime, &c.MidnightAvailable, &c.SortOrder, &c.IsActive, &c.CreatedAt,
		); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, c)
	}
	return out, nil
}

func (r *Phase2Repo) SaveCity(ctx context.Context, c *domain.City) (*domain.City, error) {
	cutoff := c.SameDayCutoffTime
	if cutoff == "" {
		cutoff = "17:00"
	}
	var out domain.City
	var err error
	if c.ID > 0 {
		err = r.pool.QueryRow(ctx, `
			UPDATE cities SET state_id=$2, name=$3, slug=$4, is_popular=$5, landmark_key=$6,
			  base_delivery_charge_paise=$7, same_day_cutoff_time=$8::TIME, midnight_available=$9, sort_order=$10, is_active=$11
			WHERE id=$1
			RETURNING id, state_id, '', name, slug, is_popular, landmark_key, base_delivery_charge_paise, TO_CHAR(same_day_cutoff_time, 'HH24:MI'), midnight_available, sort_order, is_active, created_at
		`, c.ID, c.StateID, c.Name, c.Slug, c.IsPopular, c.LandmarkKey, c.BaseDeliveryChargePaise, cutoff, c.MidnightAvailable, c.SortOrder, c.IsActive).Scan(
			&out.ID, &out.StateID, &out.StateName, &out.Name, &out.Slug, &out.IsPopular, &out.LandmarkKey,
			&out.BaseDeliveryChargePaise, &out.SameDayCutoffTime, &out.MidnightAvailable, &out.SortOrder, &out.IsActive, &out.CreatedAt,
		)
	} else {
		err = r.pool.QueryRow(ctx, `
			INSERT INTO cities (state_id, name, slug, is_popular, landmark_key, base_delivery_charge_paise, same_day_cutoff_time, midnight_available, sort_order, is_active)
			VALUES ($1,$2,$3,$4,$5,$6,$7::TIME,$8,$9,$10)
			RETURNING id, state_id, '', name, slug, is_popular, landmark_key, base_delivery_charge_paise, TO_CHAR(same_day_cutoff_time, 'HH24:MI'), midnight_available, sort_order, is_active, created_at
		`, c.StateID, c.Name, c.Slug, c.IsPopular, c.LandmarkKey, c.BaseDeliveryChargePaise, cutoff, c.MidnightAvailable, c.SortOrder, c.IsActive).Scan(
			&out.ID, &out.StateID, &out.StateName, &out.Name, &out.Slug, &out.IsPopular, &out.LandmarkKey,
			&out.BaseDeliveryChargePaise, &out.SameDayCutoffTime, &out.MidnightAvailable, &out.SortOrder, &out.IsActive, &out.CreatedAt,
		)
	}
	return &out, mapErr(err)
}

func (r *Phase2Repo) ListPincodes(ctx context.Context, cityID *int64, search string, page, limit int) ([]domain.Pincode, int64, error) {
	where := []string{"1=1"}
	args := []any{}
	if cityID != nil {
		args = append(args, *cityID)
		where = append(where, fmt.Sprintf("p.city_id = $%d", len(args)))
	}
	if search != "" {
		args = append(args, "%"+search+"%")
		where = append(where, fmt.Sprintf("(p.code ILIKE $%d OR p.area_name ILIKE $%d)", len(args), len(args)))
	}
	wSQL := strings.Join(where, " AND ")
	var total int64
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM pincodes p WHERE `+wSQL, args...).Scan(&total)

	offset := (page - 1) * limit
	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, `
		SELECT p.id, p.city_id, c.name, p.code, p.area_name, p.extra_charge_paise, p.is_express_available, p.is_serviceable, p.created_at
		FROM pincodes p JOIN cities c ON c.id = p.city_id
		WHERE `+wSQL+` ORDER BY p.code ASC LIMIT $`+fmt.Sprint(len(args)-1)+` OFFSET $`+fmt.Sprint(len(args)), args...)
	if err != nil {
		return nil, 0, mapErr(err)
	}
	defer rows.Close()
	out := []domain.Pincode{}
	for rows.Next() {
		var p domain.Pincode
		if err := rows.Scan(&p.ID, &p.CityID, &p.CityName, &p.Code, &p.AreaName, &p.ExtraChargePaise, &p.IsExpressAvailable, &p.IsServiceable, &p.CreatedAt); err != nil {
			return nil, 0, mapErr(err)
		}
		out = append(out, p)
	}
	return out, total, nil
}

func (r *Phase2Repo) SavePincode(ctx context.Context, p *domain.Pincode) (*domain.Pincode, error) {
	var out domain.Pincode
	var err error
	if p.ID > 0 {
		err = r.pool.QueryRow(ctx, `
			UPDATE pincodes SET city_id=$2, code=$3, area_name=$4, extra_charge_paise=$5, is_express_available=$6, is_serviceable=$7
			WHERE id=$1 RETURNING id, city_id, '', code, area_name, extra_charge_paise, is_express_available, is_serviceable, created_at
		`, p.ID, p.CityID, p.Code, p.AreaName, p.ExtraChargePaise, p.IsExpressAvailable, p.IsServiceable).Scan(
			&out.ID, &out.CityID, &out.CityName, &out.Code, &out.AreaName, &out.ExtraChargePaise, &out.IsExpressAvailable, &out.IsServiceable, &out.CreatedAt,
		)
	} else {
		err = r.pool.QueryRow(ctx, `
			INSERT INTO pincodes (city_id, code, area_name, extra_charge_paise, is_express_available, is_serviceable)
			VALUES ($1,$2,$3,$4,$5,$6)
			ON CONFLICT (code) DO UPDATE SET city_id=EXCLUDED.city_id, area_name=EXCLUDED.area_name, extra_charge_paise=EXCLUDED.extra_charge_paise, is_express_available=EXCLUDED.is_express_available, is_serviceable=EXCLUDED.is_serviceable
			RETURNING id, city_id, '', code, area_name, extra_charge_paise, is_express_available, is_serviceable, created_at
		`, p.CityID, p.Code, p.AreaName, p.ExtraChargePaise, p.IsExpressAvailable, p.IsServiceable).Scan(
			&out.ID, &out.CityID, &out.CityName, &out.Code, &out.AreaName, &out.ExtraChargePaise, &out.IsExpressAvailable, &out.IsServiceable, &out.CreatedAt,
		)
	}
	return &out, mapErr(err)
}

func (r *Phase2Repo) DeletePincode(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM pincodes WHERE id=$1`, id)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Phase2Repo) ListTimeSlots(ctx context.Context, activeOnly bool) ([]domain.TimeSlotTemplate, error) {
	q := `SELECT id, label, TO_CHAR(start_time,'HH24:MI'), TO_CHAR(end_time,'HH24:MI'), is_midnight, extra_charge_paise, default_capacity, sort_order, is_active FROM time_slot_templates`
	if activeOnly {
		q += ` WHERE is_active = TRUE`
	}
	q += ` ORDER BY sort_order ASC, id ASC`
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.TimeSlotTemplate{}
	for rows.Next() {
		var t domain.TimeSlotTemplate
		if err := rows.Scan(&t.ID, &t.Label, &t.StartTime, &t.EndTime, &t.IsMidnight, &t.ExtraChargePaise, &t.DefaultCapacity, &t.SortOrder, &t.IsActive); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, t)
	}
	return out, nil
}

func (r *Phase2Repo) SaveTimeSlot(ctx context.Context, t *domain.TimeSlotTemplate) (*domain.TimeSlotTemplate, error) {
	var out domain.TimeSlotTemplate
	var err error
	if t.ID > 0 {
		err = r.pool.QueryRow(ctx, `
			UPDATE time_slot_templates SET label=$2, start_time=$3::TIME, end_time=$4::TIME, is_midnight=$5, extra_charge_paise=$6, default_capacity=$7, sort_order=$8, is_active=$9
			WHERE id=$1 RETURNING id, label, TO_CHAR(start_time,'HH24:MI'), TO_CHAR(end_time,'HH24:MI'), is_midnight, extra_charge_paise, default_capacity, sort_order, is_active
		`, t.ID, t.Label, t.StartTime, t.EndTime, t.IsMidnight, t.ExtraChargePaise, t.DefaultCapacity, t.SortOrder, t.IsActive).Scan(
			&out.ID, &out.Label, &out.StartTime, &out.EndTime, &out.IsMidnight, &out.ExtraChargePaise, &out.DefaultCapacity, &out.SortOrder, &out.IsActive,
		)
	} else {
		err = r.pool.QueryRow(ctx, `
			INSERT INTO time_slot_templates (label, start_time, end_time, is_midnight, extra_charge_paise, default_capacity, sort_order, is_active)
			VALUES ($1,$2::TIME,$3::TIME,$4,$5,$6,$7,$8)
			RETURNING id, label, TO_CHAR(start_time,'HH24:MI'), TO_CHAR(end_time,'HH24:MI'), is_midnight, extra_charge_paise, default_capacity, sort_order, is_active
		`, t.Label, t.StartTime, t.EndTime, t.IsMidnight, t.ExtraChargePaise, t.DefaultCapacity, t.SortOrder, t.IsActive).Scan(
			&out.ID, &out.Label, &out.StartTime, &out.EndTime, &out.IsMidnight, &out.ExtraChargePaise, &out.DefaultCapacity, &out.SortOrder, &out.IsActive,
		)
	}
	return &out, mapErr(err)
}

func (r *Phase2Repo) ListSlotLedger(ctx context.Context, cityID int64, date string) ([]domain.SlotCapacityOverride, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT COALESCE(l.id, 0), $1::BIGINT, ts.id, ts.label, $2::TEXT,
		       COALESCE(l.max_capacity, ts.default_capacity), COALESCE(l.reserved_count, 0), COALESCE(l.is_blocked, FALSE)
		FROM time_slot_templates ts
		LEFT JOIN slot_capacity_ledger l ON l.slot_template_id = ts.id AND l.city_id = $1 AND l.service_date = $2::DATE
		WHERE ts.is_active = TRUE
		ORDER BY ts.sort_order ASC
	`, cityID, date)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.SlotCapacityOverride{}
	for rows.Next() {
		var ov domain.SlotCapacityOverride
		if err := rows.Scan(&ov.ID, &ov.CityID, &ov.SlotTemplateID, &ov.SlotLabel, &ov.ServiceDate, &ov.MaxCapacity, &ov.ReservedCount, &ov.IsBlocked); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, ov)
	}
	return out, nil
}

func (r *Phase2Repo) UpsertSlotLedger(ctx context.Context, ov *domain.SlotCapacityOverride) (*domain.SlotCapacityOverride, error) {
	var out domain.SlotCapacityOverride
	err := r.pool.QueryRow(ctx, `
		INSERT INTO slot_capacity_ledger (city_id, slot_template_id, service_date, max_capacity, is_blocked)
		VALUES ($1,$2,$3::DATE,$4,$5)
		ON CONFLICT (city_id, slot_template_id, service_date)
		DO UPDATE SET max_capacity = EXCLUDED.max_capacity, is_blocked = EXCLUDED.is_blocked
		RETURNING id, city_id, slot_template_id, '', TO_CHAR(service_date,'YYYY-MM-DD'), max_capacity, reserved_count, is_blocked
	`, ov.CityID, ov.SlotTemplateID, ov.ServiceDate, ov.MaxCapacity, ov.IsBlocked).Scan(
		&out.ID, &out.CityID, &out.SlotTemplateID, &out.SlotLabel, &out.ServiceDate, &out.MaxCapacity, &out.ReservedCount, &out.IsBlocked,
	)
	return &out, mapErr(err)
}

func (r *Phase2Repo) ListBlackoutDates(ctx context.Context, cityID *int64) ([]domain.BlackoutDate, error) {
	where := "1=1"
	args := []any{}
	if cityID != nil {
		where = "(b.city_id = $1 OR b.city_id IS NULL)"
		args = append(args, *cityID)
	}
	rows, err := r.pool.Query(ctx, `
		SELECT b.id, b.city_id, COALESCE(c.name,'All Cities'), TO_CHAR(b.blackout_date,'YYYY-MM-DD'), b.reason, b.block_same_day, b.extra_surge_paise
		FROM blackout_dates b LEFT JOIN cities c ON c.id = b.city_id
		WHERE `+where+` ORDER BY b.blackout_date DESC
	`, args...)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.BlackoutDate{}
	for rows.Next() {
		var bd domain.BlackoutDate
		if err := rows.Scan(&bd.ID, &bd.CityID, &bd.CityName, &bd.BlackoutDate, &bd.Reason, &bd.BlockSameDay, &bd.ExtraSurgePaise); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, bd)
	}
	return out, nil
}

func (r *Phase2Repo) SaveBlackoutDate(ctx context.Context, b *domain.BlackoutDate) (*domain.BlackoutDate, error) {
	var out domain.BlackoutDate
	err := r.pool.QueryRow(ctx, `
		INSERT INTO blackout_dates (city_id, blackout_date, reason, block_same_day, extra_surge_paise)
		VALUES ($1,$2::DATE,$3,$4,$5)
		RETURNING id, city_id, '', TO_CHAR(blackout_date,'YYYY-MM-DD'), reason, block_same_day, extra_surge_paise
	`, b.CityID, b.BlackoutDate, b.Reason, b.BlockSameDay, b.ExtraSurgePaise).Scan(
		&out.ID, &out.CityID, &out.CityName, &out.BlackoutDate, &out.Reason, &out.BlockSameDay, &out.ExtraSurgePaise,
	)
	return &out, mapErr(err)
}

func (r *Phase2Repo) DeleteBlackoutDate(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM blackout_dates WHERE id=$1`, id)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Phase2Repo) ListDecoratorTeams(ctx context.Context, cityID *int64) ([]domain.DecoratorTeam, error) {
	where := "1=1"
	args := []any{}
	if cityID != nil {
		where = "d.city_id = $1"
		args = append(args, *cityID)
	}
	rows, err := r.pool.Query(ctx, `
		SELECT d.id, d.city_id, c.name, d.name, d.phone, d.daily_capacity, d.is_active
		FROM decorator_teams d JOIN cities c ON c.id = d.city_id
		WHERE `+where+` ORDER BY d.name ASC
	`, args...)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.DecoratorTeam{}
	for rows.Next() {
		var d domain.DecoratorTeam
		if err := rows.Scan(&d.ID, &d.CityID, &d.CityName, &d.Name, &d.Phone, &d.DailyCapacity, &d.IsActive); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, d)
	}
	return out, nil
}

func (r *Phase2Repo) SaveDecoratorTeam(ctx context.Context, d *domain.DecoratorTeam) (*domain.DecoratorTeam, error) {
	var out domain.DecoratorTeam
	var err error
	if d.ID > 0 {
		err = r.pool.QueryRow(ctx, `UPDATE decorator_teams SET city_id=$2, name=$3, phone=$4, daily_capacity=$5, is_active=$6 WHERE id=$1 RETURNING id, city_id, '', name, phone, daily_capacity, is_active`,
			d.ID, d.CityID, d.Name, d.Phone, d.DailyCapacity, d.IsActive).Scan(&out.ID, &out.CityID, &out.CityName, &out.Name, &out.Phone, &out.DailyCapacity, &out.IsActive)
	} else {
		err = r.pool.QueryRow(ctx, `INSERT INTO decorator_teams (city_id, name, phone, daily_capacity, is_active) VALUES ($1,$2,$3,$4,$5) RETURNING id, city_id, '', name, phone, daily_capacity, is_active`,
			d.CityID, d.Name, d.Phone, d.DailyCapacity, d.IsActive).Scan(&out.ID, &out.CityID, &out.CityName, &out.Name, &out.Phone, &out.DailyCapacity, &out.IsActive)
	}
	return &out, mapErr(err)
}

func (r *Phase2Repo) ListPresets(ctx context.Context, presetType, search string) ([]domain.Preset, error) {
	where := []string{"1=1"}
	args := []any{}
	if presetType != "" {
		args = append(args, presetType)
		where = append(where, fmt.Sprintf("preset_type = $%d", len(args)))
	}
	if search != "" {
		args = append(args, "%"+search+"%")
		where = append(where, fmt.Sprintf("(name ILIKE $%d OR slug ILIKE $%d)", len(args), len(args)))
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, preset_type, name, slug, metadata, sort_order, is_active, created_at
		FROM presets WHERE `+strings.Join(where, " AND ")+` ORDER BY sort_order ASC, id ASC
	`, args...)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.Preset{}
	for rows.Next() {
		var p domain.Preset
		if err := rows.Scan(&p.ID, &p.PresetType, &p.Name, &p.Slug, &p.Metadata, &p.SortOrder, &p.IsActive, &p.CreatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, p)
	}
	return out, nil
}

func (r *Phase2Repo) SavePreset(ctx context.Context, p *domain.Preset) (*domain.Preset, error) {
	meta := p.Metadata
	if len(meta) == 0 {
		meta = json.RawMessage("{}")
	}
	var out domain.Preset
	var err error
	if p.ID > 0 {
		err = r.pool.QueryRow(ctx, `
			UPDATE presets SET preset_type=$2, name=$3, slug=$4, metadata=$5, sort_order=$6, is_active=$7
			WHERE id=$1 RETURNING id, preset_type, name, slug, metadata, sort_order, is_active, created_at
		`, p.ID, p.PresetType, p.Name, p.Slug, meta, p.SortOrder, p.IsActive).Scan(
			&out.ID, &out.PresetType, &out.Name, &out.Slug, &out.Metadata, &out.SortOrder, &out.IsActive, &out.CreatedAt,
		)
	} else {
		err = r.pool.QueryRow(ctx, `
			INSERT INTO presets (preset_type, name, slug, metadata, sort_order, is_active)
			VALUES ($1,$2,$3,$4,$5,$6)
			ON CONFLICT (preset_type, slug) DO UPDATE SET name=EXCLUDED.name, metadata=EXCLUDED.metadata, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active
			RETURNING id, preset_type, name, slug, metadata, sort_order, is_active, created_at
		`, p.PresetType, p.Name, p.Slug, meta, p.SortOrder, p.IsActive).Scan(
			&out.ID, &out.PresetType, &out.Name, &out.Slug, &out.Metadata, &out.SortOrder, &out.IsActive, &out.CreatedAt,
		)
	}
	return &out, mapErr(err)
}

func (r *Phase2Repo) DeletePreset(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM presets WHERE id=$1`, id)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// ---------- Customers, Coins Wallet & Coupons ----------

func (r *Phase2Repo) ListCustomers(ctx context.Context, search string, page, limit int) ([]domain.Customer, int64, error) {
	where := "c.deleted_at IS NULL"
	args := []any{}
	if search != "" {
		args = append(args, "%"+search+"%")
		where += " AND (c.name ILIKE $1 OR c.phone ILIKE $1 OR c.email ILIKE $1)"
	}
	var total int64
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM customers c WHERE `+where, args...).Scan(&total)

	offset := (page - 1) * limit
	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, `
		SELECT c.id, c.name, c.phone, c.email, c.whatsapp_opt_in, c.is_blocked,
		       COALESCE(cw.balance_coins, 0),
		       COUNT(o.id)::BIGINT, COALESCE(SUM(CASE WHEN o.payment_status='paid' THEN o.total_paise ELSE 0 END), 0)::BIGINT,
		       c.created_at
		FROM customers c
		LEFT JOIN coin_wallets cw ON cw.customer_id = c.id
		LEFT JOIN orders o ON o.customer_id = c.id AND o.deleted_at IS NULL
		WHERE `+where+`
		GROUP BY c.id, cw.balance_coins
		ORDER BY c.id DESC
		LIMIT $`+fmt.Sprint(len(args)-1)+` OFFSET $`+fmt.Sprint(len(args)), args...)
	if err != nil {
		return nil, 0, mapErr(err)
	}
	defer rows.Close()
	out := []domain.Customer{}
	for rows.Next() {
		var cust domain.Customer
		if err := rows.Scan(&cust.ID, &cust.Name, &cust.Phone, &cust.Email, &cust.WhatsappOptIn, &cust.IsBlocked, &cust.CoinsBalance, &cust.OrdersCount, &cust.TotalSpentPaise, &cust.CreatedAt); err != nil {
			return nil, 0, mapErr(err)
		}
		out = append(out, cust)
	}
	return out, total, nil
}

func (r *Phase2Repo) GetCustomerDetail(ctx context.Context, id int64) (*domain.Customer, error) {
	var c domain.Customer
	err := r.pool.QueryRow(ctx, `
		SELECT c.id, c.name, c.phone, c.email, c.whatsapp_opt_in, c.is_blocked, COALESCE(cw.balance_coins, 0), c.created_at
		FROM customers c LEFT JOIN coin_wallets cw ON cw.customer_id = c.id
		WHERE c.id = $1 AND c.deleted_at IS NULL
	`, id).Scan(&c.ID, &c.Name, &c.Phone, &c.Email, &c.WhatsappOptIn, &c.IsBlocked, &c.CoinsBalance, &c.CreatedAt)
	if err != nil {
		return nil, mapErr(err)
	}

	aRows, err := r.pool.Query(ctx, `
		SELECT a.id, a.customer_id, a.label, a.recipient_name, a.recipient_phone, a.address_line1, a.address_line2, a.landmark, a.city_id, COALESCE(ci.name,''), a.pincode, a.is_default
		FROM customer_addresses a LEFT JOIN cities ci ON ci.id = a.city_id WHERE a.customer_id = $1 ORDER BY a.is_default DESC, a.id DESC
	`, id)
	if err == nil {
		defer aRows.Close()
		for aRows.Next() {
			var addr domain.CustomerAddress
			if aRows.Scan(&addr.ID, &addr.CustomerID, &addr.Label, &addr.RecipientName, &addr.RecipientPhone, &addr.AddressLine1, &addr.AddressLine2, &addr.Landmark, &addr.CityID, &addr.CityName, &addr.Pincode, &addr.IsDefault) == nil {
				c.Addresses = append(c.Addresses, addr)
			}
		}
	}

	tRows, err := r.pool.Query(ctx, `
		SELECT id, customer_id, order_id, delta, tx_type, expires_at, note, admin_user_id, created_at
		FROM coin_transactions WHERE customer_id = $1 ORDER BY id DESC LIMIT 50
	`, id)
	if err == nil {
		defer tRows.Close()
		for tRows.Next() {
			var tx domain.CoinTransaction
			if tRows.Scan(&tx.ID, &tx.CustomerID, &tx.OrderID, &tx.Delta, &tx.TxType, &tx.ExpiresAt, &tx.Note, &tx.AdminUserID, &tx.CreatedAt) == nil {
				c.CoinHistory = append(c.CoinHistory, tx)
			}
		}
	}
	return &c, nil
}

func (r *Phase2Repo) SetCustomerBlocked(ctx context.Context, id int64, blocked bool) error {
	tag, err := r.pool.Exec(ctx, `UPDATE customers SET is_blocked = $2 WHERE id = $1 AND deleted_at IS NULL`, id, blocked)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Phase2Repo) AdjustCustomerCoinsTx(ctx context.Context, customerID int64, delta int, note string, adminID int64) (int, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `INSERT INTO coin_wallets (customer_id, balance_coins) VALUES ($1, 0) ON CONFLICT (customer_id) DO NOTHING`, customerID)
	if err != nil {
		return 0, mapErr(err)
	}

	var cur int
	err = tx.QueryRow(ctx, `SELECT balance_coins FROM coin_wallets WHERE customer_id = $1 FOR UPDATE`, customerID).Scan(&cur)
	if err != nil {
		return 0, mapErr(err)
	}
	next := cur + delta
	if next < 0 {
		return 0, domain.ErrInsufficientCoins
	}

	if _, err := tx.Exec(ctx, `UPDATE coin_wallets SET balance_coins = $2, updated_at = NOW() WHERE customer_id = $1`, customerID, next); err != nil {
		return 0, mapErr(err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO coin_transactions (customer_id, delta, tx_type, note, admin_user_id)
		VALUES ($1, $2, 'admin_adjust', $3, $4)
	`, customerID, delta, note, adminID); err != nil {
		return 0, mapErr(err)
	}

	return next, tx.Commit(ctx)
}

func (r *Phase2Repo) ListCoupons(ctx context.Context, search string) ([]domain.Coupon, error) {
	where := "1=1"
	args := []any{}
	if search != "" {
		where = "code ILIKE $1 OR description ILIKE $1"
		args = append(args, "%"+search+"%")
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, code, description, discount_type, discount_value, max_discount_paise, min_cart_paise,
		       applicable_category_ids, applicable_city_ids, total_usage_limit, used_count, per_user_limit,
		       valid_from, valid_until, is_active, created_at
		FROM coupons WHERE `+where+` ORDER BY id DESC
	`, args...)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.Coupon{}
	for rows.Next() {
		var cp domain.Coupon
		var catRaw, cityRaw []byte
		if err := rows.Scan(&cp.ID, &cp.Code, &cp.Description, &cp.DiscountType, &cp.DiscountValue, &cp.MaxDiscountPaise,
			&cp.MinCartPaise, &catRaw, &cityRaw, &cp.TotalUsageLimit, &cp.UsedCount, &cp.PerUserLimit,
			&cp.ValidFrom, &cp.ValidUntil, &cp.IsActive, &cp.CreatedAt); err != nil {
			return nil, mapErr(err)
		}
		_ = json.Unmarshal(catRaw, &cp.ApplicableCategoryIDs)
		_ = json.Unmarshal(cityRaw, &cp.ApplicableCityIDs)
		out = append(out, cp)
	}
	return out, nil
}

func (r *Phase2Repo) SaveCoupon(ctx context.Context, c *domain.Coupon) (*domain.Coupon, error) {
	catBytes, _ := json.Marshal(nonNilSlice(c.ApplicableCategoryIDs))
	cityBytes, _ := json.Marshal(nonNilSlice(c.ApplicableCityIDs))
	code := strings.ToUpper(strings.TrimSpace(c.Code))

	var out domain.Coupon
	var catRaw, cityRaw []byte
	var err error
	if c.ID > 0 {
		err = r.pool.QueryRow(ctx, `
			UPDATE coupons SET code=$2, description=$3, discount_type=$4, discount_value=$5, max_discount_paise=$6,
			  min_cart_paise=$7, applicable_category_ids=$8, applicable_city_ids=$9, total_usage_limit=$10,
			  per_user_limit=$11, valid_from=$12, valid_until=$13, is_active=$14
			WHERE id=$1
			RETURNING id, code, description, discount_type, discount_value, max_discount_paise, min_cart_paise,
			  applicable_category_ids, applicable_city_ids, total_usage_limit, used_count, per_user_limit,
			  valid_from, valid_until, is_active, created_at
		`, c.ID, code, c.Description, c.DiscountType, c.DiscountValue, c.MaxDiscountPaise, c.MinCartPaise,
			catBytes, cityBytes, c.TotalUsageLimit, max(1, c.PerUserLimit), c.ValidFrom, c.ValidUntil, c.IsActive).Scan(
			&out.ID, &out.Code, &out.Description, &out.DiscountType, &out.DiscountValue, &out.MaxDiscountPaise,
			&out.MinCartPaise, &catRaw, &cityRaw, &out.TotalUsageLimit, &out.UsedCount, &out.PerUserLimit,
			&out.ValidFrom, &out.ValidUntil, &out.IsActive, &out.CreatedAt,
		)
	} else {
		err = r.pool.QueryRow(ctx, `
			INSERT INTO coupons (code, description, discount_type, discount_value, max_discount_paise, min_cart_paise,
			  applicable_category_ids, applicable_city_ids, total_usage_limit, per_user_limit, valid_from, valid_until, is_active)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
			RETURNING id, code, description, discount_type, discount_value, max_discount_paise, min_cart_paise,
			  applicable_category_ids, applicable_city_ids, total_usage_limit, used_count, per_user_limit,
			  valid_from, valid_until, is_active, created_at
		`, code, c.Description, c.DiscountType, c.DiscountValue, c.MaxDiscountPaise, c.MinCartPaise,
			catBytes, cityBytes, c.TotalUsageLimit, max(1, c.PerUserLimit), c.ValidFrom, c.ValidUntil, c.IsActive).Scan(
			&out.ID, &out.Code, &out.Description, &out.DiscountType, &out.DiscountValue, &out.MaxDiscountPaise,
			&out.MinCartPaise, &catRaw, &cityRaw, &out.TotalUsageLimit, &out.UsedCount, &out.PerUserLimit,
			&out.ValidFrom, &out.ValidUntil, &out.IsActive, &out.CreatedAt,
		)
	}
	if err == nil {
		_ = json.Unmarshal(catRaw, &out.ApplicableCategoryIDs)
		_ = json.Unmarshal(cityRaw, &out.ApplicableCityIDs)
	}
	return &out, mapErr(err)
}

func (r *Phase2Repo) DeleteCoupon(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM coupons WHERE id=$1`, id)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// ---------- Payments, Idempotent Webhooks, Refunds & Settlement ----------

func (r *Phase2Repo) ListPaymentTransactions(ctx context.Context, status string, page, limit int) ([]domain.PaymentTransaction, int64, error) {
	where := "1=1"
	args := []any{}
	if status != "" {
		where = "pt.status = $1"
		args = append(args, status)
	}
	var total int64
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM payment_transactions pt WHERE `+where, args...).Scan(&total)

	offset := (page - 1) * limit
	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, `
		SELECT pt.id, pt.order_id, o.order_number, pt.gateway, pt.gateway_order_id, pt.gateway_payment_id,
		       pt.gateway_event_id, pt.idempotency_key, pt.amount_paise, pt.status, pt.created_at
		FROM payment_transactions pt JOIN orders o ON o.id = pt.order_id
		WHERE `+where+` ORDER BY pt.id DESC LIMIT $`+fmt.Sprint(len(args)-1)+` OFFSET $`+fmt.Sprint(len(args)), args...)
	if err != nil {
		return nil, 0, mapErr(err)
	}
	defer rows.Close()
	out := []domain.PaymentTransaction{}
	for rows.Next() {
		var pt domain.PaymentTransaction
		if err := rows.Scan(&pt.ID, &pt.OrderID, &pt.OrderNumber, &pt.Gateway, &pt.GatewayOrderID, &pt.GatewayPaymentID,
			&pt.GatewayEventID, &pt.IdempotencyKey, &pt.AmountPaise, &pt.Status, &pt.CreatedAt); err != nil {
			return nil, 0, mapErr(err)
		}
		out = append(out, pt)
	}
	return out, total, nil
}

func (r *Phase2Repo) RecordIdempotentPaymentWebhookTx(ctx context.Context, txIn *domain.PaymentTransaction) (bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)

	raw := txIn.RawPayload
	if len(raw) == 0 {
		raw = json.RawMessage("{}")
	}

	var insertedID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO payment_transactions (
			order_id, gateway, gateway_order_id, gateway_payment_id, gateway_event_id, idempotency_key, amount_paise, status, raw_payload
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		ON CONFLICT (gateway, gateway_event_id) DO NOTHING
		RETURNING id
	`, txIn.OrderID, txIn.Gateway, txIn.GatewayOrderID, txIn.GatewayPaymentID, txIn.GatewayEventID, txIn.IdempotencyKey, txIn.AmountPaise, txIn.Status, raw).Scan(&insertedID)
	if errors.Is(err, pgx.ErrNoRows) {
		return true, nil // duplicate webhook cleanly ignored
	}
	if err != nil {
		return false, mapErr(err)
	}

	if strings.EqualFold(txIn.Status, "captured") || strings.EqualFold(txIn.Status, "paid") {
		var curStatus string
		var orderTotal int64
		if err := tx.QueryRow(ctx, `SELECT status, total_paise FROM orders WHERE id = $1 FOR UPDATE`, txIn.OrderID).Scan(&curStatus, &orderTotal); err == nil {
			if txIn.AmountPaise > 0 && txIn.AmountPaise < orderTotal {
				return false, fmt.Errorf("%w: captured amount (%d) is less than order total (%d)", domain.ErrValidation, txIn.AmountPaise, orderTotal)
			}
			if curStatus == domain.OrderStatusPlaced {
				_, _ = tx.Exec(ctx, `UPDATE orders SET payment_status = 'paid', status = 'confirmed' WHERE id = $1`, txIn.OrderID)
				_, _ = tx.Exec(ctx, `INSERT INTO order_status_history (order_id, from_status, to_status, actor_type, reason) VALUES ($1, 'placed', 'confirmed', 'webhook', 'Payment captured')`, txIn.OrderID)
			} else {
				_, _ = tx.Exec(ctx, `UPDATE orders SET payment_status = 'paid' WHERE id = $1`, txIn.OrderID)
			}
		}
	} else if strings.EqualFold(txIn.Status, "failed") {
		_, _ = tx.Exec(ctx, `UPDATE orders SET payment_status = 'failed' WHERE id = $1`, txIn.OrderID)
	}

	if err := tx.Commit(ctx); err != nil {
		return false, err
	}
	txIn.ID = insertedID
	return false, nil
}

func (r *Phase2Repo) ListRefunds(ctx context.Context, page, limit int) ([]domain.Refund, int64, error) {
	var total int64
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM refunds`).Scan(&total)
	offset := (page - 1) * limit
	rows, err := r.pool.Query(ctx, `
		SELECT r.id, r.order_id, o.order_number, r.payment_transaction_id, r.amount_paise, r.cancellation_fee_paise,
		       r.reason, r.gateway_refund_id, r.idempotency_key, r.status, r.processed_by_admin_id, r.created_at
		FROM refunds r JOIN orders o ON o.id = r.order_id
		ORDER BY r.id DESC LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, mapErr(err)
	}
	defer rows.Close()
	out := []domain.Refund{}
	for rows.Next() {
		var rf domain.Refund
		if err := rows.Scan(&rf.ID, &rf.OrderID, &rf.OrderNumber, &rf.PaymentTransactionID, &rf.AmountPaise, &rf.CancellationFeePaise,
			&rf.Reason, &rf.GatewayRefundID, &rf.IdempotencyKey, &rf.Status, &rf.ProcessedByAdminID, &rf.CreatedAt); err != nil {
			return nil, 0, mapErr(err)
		}
		out = append(out, rf)
	}
	return out, total, nil
}

func (r *Phase2Repo) CreateRefundTx(ctx context.Context, in *domain.Refund, adminID int64) (*domain.Refund, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var existing domain.Refund
	if err := tx.QueryRow(ctx, `
		SELECT id, order_id, payment_transaction_id, amount_paise, cancellation_fee_paise, reason, gateway_refund_id, idempotency_key, status, processed_by_admin_id, created_at
		FROM refunds WHERE idempotency_key = $1
	`, in.IdempotencyKey).Scan(
		&existing.ID, &existing.OrderID, &existing.PaymentTransactionID, &existing.AmountPaise, &existing.CancellationFeePaise,
		&existing.Reason, &existing.GatewayRefundID, &existing.IdempotencyKey, &existing.Status, &existing.ProcessedByAdminID, &existing.CreatedAt,
	); err == nil {
		return &existing, nil // idempotent replay returns same refund
	}

	var curStatus, curPayStatus, orderNum string
	var custID *int64
	var totalPaise, cancelFee int64
	if err := tx.QueryRow(ctx, `SELECT status, payment_status, customer_id, order_number, total_paise, cancellation_fee_paise FROM orders WHERE id = $1 FOR UPDATE`, in.OrderID).Scan(&curStatus, &curPayStatus, &custID, &orderNum, &totalPaise, &cancelFee); err != nil {
		return nil, mapErr(err)
	}
	if curPayStatus != "paid" && curPayStatus != "partially_refunded" {
		return nil, fmt.Errorf("%w: order payment status is %s and cannot be refunded", domain.ErrValidation, curPayStatus)
	}

	var alreadyRefunded int64
	_ = tx.QueryRow(ctx, `SELECT COALESCE(SUM(amount_paise), 0)::BIGINT FROM refunds WHERE order_id = $1 AND status = 'processed'`, in.OrderID).Scan(&alreadyRefunded)
	maxTotalRefund := max(0, totalPaise-cancelFee)
	remainingRefundable := max(0, maxTotalRefund-alreadyRefunded)
	if remainingRefundable <= 0 {
		return nil, fmt.Errorf("%w: order has already been fully refunded", domain.ErrValidation)
	}
	if in.AmountPaise <= 0 {
		in.AmountPaise = remainingRefundable
	} else if in.AmountPaise > remainingRefundable {
		return nil, fmt.Errorf("%w: refund amount exceeds remaining refundable balance", domain.ErrValidation)
	}

	var out domain.Refund
	err = tx.QueryRow(ctx, `
		INSERT INTO refunds (order_id, payment_transaction_id, amount_paise, cancellation_fee_paise, reason, gateway_refund_id, idempotency_key, status, processed_by_admin_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,'processed',$8)
		RETURNING id, order_id, payment_transaction_id, amount_paise, cancellation_fee_paise, reason, gateway_refund_id, idempotency_key, status, processed_by_admin_id, created_at
	`, in.OrderID, in.PaymentTransactionID, in.AmountPaise, cancelFee, in.Reason, fmt.Sprintf("rfnd_%d", time.Now().UnixNano()), in.IdempotencyKey, adminID).Scan(
		&out.ID, &out.OrderID, &out.PaymentTransactionID, &out.AmountPaise, &out.CancellationFeePaise,
		&out.Reason, &out.GatewayRefundID, &out.IdempotencyKey, &out.Status, &out.ProcessedByAdminID, &out.CreatedAt,
	)
	if err != nil {
		return nil, mapErr(err)
	}

	totalAfter := alreadyRefunded + in.AmountPaise
	payStatus := "partially_refunded"
	nextOrderStatus := curStatus
	if totalAfter >= maxTotalRefund {
		payStatus = "refunded"
		nextOrderStatus = domain.OrderStatusRefunded
	}
	if _, err := tx.Exec(ctx, `UPDATE orders SET payment_status = $2, status = $3 WHERE id = $1`, in.OrderID, payStatus, nextOrderStatus); err != nil {
		return nil, mapErr(err)
	}
	if nextOrderStatus != curStatus {
		_, _ = tx.Exec(ctx, `INSERT INTO order_status_history (order_id, from_status, to_status, actor_type, actor_id, reason) VALUES ($1, $2, $3, 'admin', $4, $5)`,
			in.OrderID, curStatus, nextOrderStatus, adminID, in.Reason)
	}
	if payStatus == "refunded" && custID != nil {
		var earnedCoins int
		_ = tx.QueryRow(ctx, `SELECT COALESCE(SUM(delta), 0) FROM coin_transactions WHERE order_id = $1 AND tx_type = 'earn'`, in.OrderID).Scan(&earnedCoins)
		if earnedCoins > 0 {
			var curBal int
			if tx.QueryRow(ctx, `SELECT balance_coins FROM coin_wallets WHERE customer_id = $1 FOR UPDATE`, *custID).Scan(&curBal) == nil && curBal > 0 {
				clawback := min(curBal, earnedCoins)
				_, _ = tx.Exec(ctx, `UPDATE coin_wallets SET balance_coins = balance_coins - $2, updated_at = NOW() WHERE customer_id = $1`, *custID, clawback)
				_, _ = tx.Exec(ctx, `INSERT INTO coin_transactions (customer_id, order_id, delta, tx_type, admin_user_id, note) VALUES ($1, $2, $3, 'refund_clawback', $4, $5)`,
					*custID, in.OrderID, -clawback, adminID, "Coins clawed back on refund of "+orderNum)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *Phase2Repo) GetSettlementReport(ctx context.Context, from, to time.Time) (*domain.SettlementReport, error) {
	rep := &domain.SettlementReport{
		From: from.Format("2006-01-02"),
		To:   to.Format("2006-01-02"),
	}
	_ = r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(total_paise), 0)::BIGINT, COALESCE(SUM(tax_gst_paise), 0)::BIGINT,
		       COALESCE(SUM(cancellation_fee_paise), 0)::BIGINT, COUNT(*)::BIGINT
		FROM orders
		WHERE payment_status IN ('paid', 'partially_refunded', 'refunded') AND placed_at >= $1 AND placed_at <= $2
	`, from, to).Scan(&rep.GrossCapturedPaise, &rep.TotalGSTPaise, &rep.CancelFeesRetained, &rep.CapturedCount)

	_ = r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount_paise), 0)::BIGINT, COUNT(*)::BIGINT
		FROM refunds WHERE status = 'processed' AND created_at >= $1 AND created_at <= $2
	`, from, to).Scan(&rep.TotalRefundedPaise, &rep.RefundCount)

	rep.NetSettlementPaise = rep.GrossCapturedPaise - rep.TotalRefundedPaise
	return rep, nil
}

func nonNilSlice(s []int64) []int64 {
	if s == nil {
		return []int64{}
	}
	return s
}

