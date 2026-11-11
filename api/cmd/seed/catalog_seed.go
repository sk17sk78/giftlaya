package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"github.com/giftlaya/giftlaya-api/internal/service"
	"github.com/jackc/pgx/v5/pgxpool"
)

func seedGiftlayaCatalog(ctx context.Context, pool *pgxpool.Pool, logger *slog.Logger) {
	dataDir := os.Getenv("GIFTLAYA_SEED_DATA_DIR")
	if dataDir == "" {
		dataDir = "/Users/iconnect/Desktop/giftlaya ui copy/src/data"
	}

	readJSON := func(name string, dst any) bool {
		raw, err := os.ReadFile(filepath.Join(dataDir, name))
		if err != nil {
			return false
		}
		return json.Unmarshal(raw, dst) == nil
	}

	// 1. States & Cities
	var citiesDoc struct {
		PopularCities []struct {
			Name  string `json:"name"`
			Slug  string `json:"slug"`
			State string `json:"state"`
		} `json:"popularCities"`
		AllCities []string `json:"allCities"`
	}
	_ = readJSON("cities.json", &citiesDoc)

	if len(citiesDoc.PopularCities) == 0 {
		citiesDoc.PopularCities = []struct {
			Name  string `json:"name"`
			Slug  string `json:"slug"`
			State string `json:"state"`
		}{
			{Name: "Kolkata", Slug: "kolkata", State: "West Bengal"},
			{Name: "Mumbai", Slug: "mumbai", State: "Maharashtra"},
			{Name: "Delhi", Slug: "delhi", State: "Delhi NCR"},
			{Name: "Bangalore", Slug: "bangalore", State: "Karnataka"},
		}
	}

	landmarkMap := map[string]string{
		"ahmedabad": "ahmedabad", "bangalore": "bangalore", "chennai": "chennai",
		"delhi": "delhi", "gandhinagar": "gandhinagar", "gurgaon": "gurgaon",
		"kolkata": "kolkata", "mumbai": "mumbai", "navi-mumbai": "navi-mumbai",
		"pune": "pune", "surat": "surat", "visakhapatnam": "visakhapatnam",
	}

	var firstCityID int64
	for i, c := range citiesDoc.PopularCities {
		var stateID int64
		_ = pool.QueryRow(ctx, `
			INSERT INTO states (name, slug) VALUES ($1, $2)
			ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
			RETURNING id
		`, c.State, service.Slugify(c.State)).Scan(&stateID)

		var cid int64
		_ = pool.QueryRow(ctx, `
			INSERT INTO cities (state_id, name, slug, is_popular, landmark_key, base_delivery_charge_paise, same_day_cutoff_time, midnight_available, sort_order, is_active)
			VALUES ($1, $2, $3, TRUE, $4, 4900, '17:00:00', TRUE, $5, TRUE)
			ON CONFLICT (slug) DO UPDATE SET is_popular = TRUE, landmark_key = EXCLUDED.landmark_key
			RETURNING id
		`, stateID, c.Name, c.Slug, landmarkMap[c.Slug], i+1).Scan(&cid)
		if firstCityID == 0 {
			firstCityID = cid
		}
	}

	for i, name := range citiesDoc.AllCities {
		slug := service.Slugify(name)
		if slug == "" {
			continue
		}
		_, _ = pool.Exec(ctx, `
			INSERT INTO cities (name, slug, is_popular, base_delivery_charge_paise, same_day_cutoff_time, midnight_available, sort_order, is_active)
			VALUES ($1, $2, FALSE, 7900, '16:00:00', FALSE, $3, TRUE)
			ON CONFLICT (slug) DO NOTHING
		`, name, slug, 100+i)
	}

	samplePins := [][3]string{
		{"kolkata", "700001", "BBD Bagh"},
		{"kolkata", "700091", "Salt Lake Sector V"},
		{"mumbai", "400001", "Fort"},
		{"mumbai", "400050", "Bandra West"},
		{"delhi", "110001", "Connaught Place"},
		{"bangalore", "560001", "MG Road"},
		{"pune", "411001", "Camp"},
		{"ahmedabad", "380001", "Lal Darwaja"},
	}
	for _, sp := range samplePins {
		_, _ = pool.Exec(ctx, `
			INSERT INTO pincodes (city_id, code, area_name, is_express_available, is_serviceable)
			SELECT id, $2, $3, TRUE, TRUE FROM cities WHERE slug = $1
			ON CONFLICT (code) DO NOTHING
		`, sp[0], sp[1], sp[2])
	}

	// 2. Delivery Types & Time Slots
	for _, dt := range [][4]any{
		{"same_day", "Same-Day Hand Delivery", 0, "17:00:00"},
		{"midnight", "Midnight Surprise (11 PM - 12 AM)", 0, "18:00:00"},
		{"scheduled", "Scheduled Date Delivery", 1, nil},
		{"courier", "Courier Pan-India (Ships in 3-5 days)", 3, nil},
	} {
		_, _ = pool.Exec(ctx, `
			INSERT INTO delivery_types (slug, name, lead_time_days, cutoff_time, is_active)
			VALUES ($1, $2, $3, $4::TIME, TRUE)
			ON CONFLICT (slug) DO NOTHING
		`, dt[0], dt[1], dt[2], dt[3])
	}

	var slotCount int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM time_slot_templates`).Scan(&slotCount)
	if slotCount == 0 {
		for idx, ts := range [][6]any{
			{"Morning (9 AM - 12 PM)", "09:00:00", "12:00:00", false, 0, 30},
			{"Afternoon (12 PM - 4 PM)", "12:00:00", "16:00:00", false, 0, 30},
			{"Evening (4 PM - 8 PM)", "16:00:00", "20:00:00", false, 0, 35},
			{"Fixed 2-Hr Express", "10:00:00", "21:00:00", false, 9900, 20},
			{"Midnight (11 PM - 12 AM)", "23:00:00", "23:59:00", true, 19900, 15},
		} {
			_, _ = pool.Exec(ctx, `
				INSERT INTO time_slot_templates (label, start_time, end_time, is_midnight, extra_charge_paise, default_capacity, sort_order, is_active)
				VALUES ($1,$2::TIME,$3::TIME,$4,$5,$6,$7,TRUE)
			`, ts[0], ts[1], ts[2], ts[3], ts[4], ts[5], idx+1)
		}
	}

	// 3. Categories
	catDefs := [][5]string{
		{"Flowers", "flowers", "product", "https://cdn.giftlaya.com/images/8/2e461552-a4d9-485b-b49d-9946424acc01.webp", "Fresh Flowers & Bouquets Online | Giftlaya"},
		{"Cakes", "cakes", "product", "https://cdn.giftlaya.com/images/8/3ce928b9-d9f0-497e-813e-7e5b483fdf23.webp", "Order Fresh Designer Cakes | Same-Day Delivery"},
		{"Balloon Decorations", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/8/722a2647-8cdf-4026-8534-339df33d20b0.webp", "Balloon Decoration at Home | Birthday & Anniversary"},
		{"Indoor Plants", "plants", "product", "https://cdn.giftlaya.com/images/8/392615d8-f1cc-462a-a8cd-e2884f2ba305.webp", "Gift Indoor Plants & Terrariums Online"},
		{"Personalised Gifts", "custom", "product", "https://cdn.giftlaya.com/images/8/a110487f-5fc4-42c6-b99d-098de429eb73.webp", "Personalised Photo Gifts, Mugs & Cushions"},
		{"Chocolates", "chocolates", "product", "https://cdn.giftlaya.com/images/8/77eda5ba-a668-4a5d-a01e-b9a8279a4dd6.webp", "Gourmet Chocolate Boxes & Hampers"},
		{"Birthday Decoration", "birthday-decoration", "decoration", "https://cdn.giftlaya.com/images/8/722a2647-8cdf-4026-8534-339df33d20b0.webp", "Birthday Balloon Decoration at Home"},
		{"Trending Gifts", "trending", "product", "https://cdn.giftlaya.com/images/8/2e461552-a4d9-485b-b49d-9946424acc01.webp", "Trending Gifts on Giftlaya"},
	}
	catIDs := map[string]int64{}
	for idx, c := range catDefs {
		var id int64
		_ = pool.QueryRow(ctx, `
			INSERT INTO categories (name, slug, kind, image_url, seo_title, sort_order, is_active)
			VALUES ($1,$2,$3,$4,$5,$6,TRUE)
			ON CONFLICT (slug) DO UPDATE SET image_url = EXCLUDED.image_url
			RETURNING id
		`, c[0], c[1], c[2], c[3], c[4], idx+1).Scan(&id)
		catIDs[c[1]] = id
	}

	// Child sub-pages & Addon categories
	subCats := []struct {
		Name, Slug, ParentSlug, Kind, Img, SeoTitle string
		Order                                       int
	}{
		{"Anniversary Decoration", "anniversary-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/674e4dbe-bb27-4e90-b46e-ed1151d7a116.webp", "Anniversary Room Decoration at Home | Giftlaya", 9},
		{"Kids Birthday Decor", "birthday-decoration/kids", "birthday-decoration", "decoration", "https://cdn.giftlaya.com/images/93/77543e69-0000-47b3-a447-e2ad42b57268.webp", "Kids Theme Birthday Decoration | Giftlaya", 10},
		{"Roses & Bouquets", "roses", "flowers", "product", "https://cdn.giftlaya.com/images/18/05f7cce4-65c3-45f8-858b-091e953d0f17.webp", "Fresh Rose Bouquets Online | Giftlaya", 11},
		{"Chocolate Cakes", "chocolate-cakes", "cakes", "product", "https://cdn.giftlaya.com/images/18/8c8c0255-1743-4255-aff9-8e103c927f19.webp", "Order Chocolate Cakes Online | Giftlaya", 12},
		{"Combos", "combos", "", "product", "https://cdn.giftlaya.com/images/18/8f4fedf2-774e-4a0a-bb82-6f1a93e1753d.webp", "Flowers & Cakes Combos Online | Giftlaya", 21},
		{"Flower & Cake Combos", "combos/flower-n-cakes", "combos", "product", "https://cdn.giftlaya.com/images/18/8f4fedf2-774e-4a0a-bb82-6f1a93e1753d.webp", "Flowers and Cakes Combos | Giftlaya", 22},
		{"Gift Hampers", "gift-hampers", "", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Curated Gift Hampers & Baskets | Giftlaya", 23},
		{"Corporate Gifts", "corporate-gift", "", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Bulk Corporate Gifting Solutions | Giftlaya", 24},
		{"Name Reveal Boards", "name-reveal-boards", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/8/ca5307c6-d716-4e68-aa05-967d82c6fa91.webp", "Custom Baby Name Reveal Boards | Giftlaya", 25},
		{"Bento Cakes", "bento-cakes", "cakes", "product", "https://cdn.giftlaya.com/images/93/868b5486-7688-4689-bf72-9f2e7bf2a5d5.webp", "Cute Bento Cakes Online | Giftlaya", 26},
		{"Theme Cakes", "theme-cakes", "cakes", "product", "https://cdn.giftlaya.com/images/93/70b9f0d0-132e-44cc-bb13-5e73a6bdc153.webp", "Designer Theme Cakes | Giftlaya", 27},
		{"Baby Shower Cakes", "baby-shower-cakes", "cakes", "product", "https://cdn.giftlaya.com/images/93/d392f9c9-34ec-4db2-8793-2cd635d35dc4.webp", "Baby Shower Celebration Cakes | Giftlaya", 28},
		{"1st Birthday Cakes", "1st-birthday-cakes", "cakes", "product", "https://cdn.giftlaya.com/images/18/d104d837-4612-4ff7-9ea3-9b3d89c8bb37.webp", "1st Birthday Milestone Cakes | Giftlaya", 29},
		{"Decoration for Kids", "decoration-for-kids", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/77543e69-0000-47b3-a447-e2ad42b57268.webp", "Kids Theme Birthday Decoration | Giftlaya", 30},
		{"Baby Shower Decoration", "baby-shower-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/674e4dbe-bb27-4e90-b46e-ed1151d7a116.webp", "Baby Shower Balloon Decoration | Giftlaya", 31},
		{"Baby Welcome Decoration", "baby-welcome-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/0b7fb0ec-bbcc-4e67-a6bc-f3d3e0062da1.webp", "Welcome Baby Boy & Girl Decoration | Giftlaya", 32},
		{"Romantic Decoration", "romantic-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/d74b7199-6fe3-46a0-8a98-ca91a5d453c6.webp", "Romantic Room Decoration | Giftlaya", 33},
		{"Haldi Decoration", "haldi-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/6a7681e0-d719-4413-b4bc-c95292e1d4aa.webp", "Haldi Ceremony Floral Decoration | Giftlaya", 34},
		{"Candle Light Dinner", "candle-light-dinner", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/d74b7199-6fe3-46a0-8a98-ca91a5d453c6.webp", "Private Candlelight Dinner Setup | Giftlaya", 35},
		{"Personalized Mugs", "personalized-mugs", "custom", "product", "https://cdn.giftlaya.com/images/18/e479c780-3641-474e-bdf4-81779cd18930.webp", "Custom Printed Photo Mugs | Giftlaya", 36},
		{"Personalized Photo Frames", "personalized-photo-frames", "custom", "product", "https://cdn.giftlaya.com/images/18/ff2bd4ee-deec-4d28-90dd-499cd3e583a4.webp", "Personalized Photo Frames | Giftlaya", 37},
		{"Personalized Cushions", "personalized-cushions", "custom", "product", "https://cdn.giftlaya.com/images/18/937b2371-ece1-4d8c-bc17-eb69309ccb33.webp", "Custom Photo Cushions | Giftlaya", 38},
		{"Personalised Water Bottles", "personalised-water-bottles", "custom", "product", "https://cdn.giftlaya.com/images/18/705a823a-9bd3-4037-82c6-3877b16988e2.webp", "Engraved Water Bottles | Giftlaya", 39},
		{"Personalised Keychains", "personalised-keychains", "custom", "product", "https://cdn.giftlaya.com/images/18/d59b6910-68f6-4ec0-9488-afbf6c5d835d.webp", "Custom Name Keychains | Giftlaya", 40},
		{"Custom T-Shirts", "custom-t-shirts", "custom", "product", "https://cdn.giftlaya.com/images/18/5bf2fad6-cfe9-4a1c-aa91-1c6bfd28ecb1.webp", "Couple & Custom Printed Tees | Giftlaya", 41},
		{"Lilies", "lily", "flowers", "product", "https://cdn.giftlaya.com/images/18/6c292a14-a303-4049-8310-4e656ed5f472.webp", "Fresh Lily Bouquets Online | Giftlaya", 42},
		{"Orchids", "orchids", "flowers", "product", "https://cdn.giftlaya.com/images/18/5f663cc6-584d-4f57-b78c-ac52d9d2c2e4.webp", "Exotic Orchid Flower Arrangements | Giftlaya", 43},
		{"Gerberas", "gerberas", "flowers", "product", "https://cdn.giftlaya.com/images/18/6bc5aaa8-ace0-4ac5-958c-22978dc79759.webp", "Fresh Gerbera Daisy Bouquets | Giftlaya", 44},
		{"Carnations", "carnations", "flowers", "product", "https://cdn.giftlaya.com/images/18/918d3609-503b-4db4-99f2-07081be75904.webp", "Handtied Carnation Bouquets | Giftlaya", 45},
		{"Gifts", "gifts", "", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Online Gifts Delivery in India | Giftlaya", 46},
		{"Personalized Gifts", "personalized-gifts", "", "product", "https://cdn.giftlaya.com/images/8/a110487f-5fc4-42c6-b99d-098de429eb73.webp", "Personalised Gifts Online in India | Giftlaya", 47},
		{"Personalized Caricatures", "personalized-caricatures", "custom", "product", "https://cdn.giftlaya.com/images/18/ff2bd4ee-deec-4d28-90dd-499cd3e583a4.webp", "Personalized Caricatures & Standees | Giftlaya", 48},
		{"Personalised Photo Frames", "personalised-photo-frames", "custom", "product", "https://cdn.giftlaya.com/images/18/ff2bd4ee-deec-4d28-90dd-499cd3e583a4.webp", "Personalised Photo Frames Online | Giftlaya", 49},
		{"Balloon Bouquets", "balloon-bouquets", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/4/f3a524d5-531f-4771-bf30-a8e214472a3b.webp", "Customized Balloon Bouquets Online | Giftlaya", 50},
		{"Valentine's Day", "valentines-day", "gifts", "product", "https://cdn.giftlaya.com/images/18/05f7cce4-65c3-45f8-858b-091e953d0f17.webp", "Valentine's Day Gifts, Flowers & Decor | Giftlaya", 51},
		{"Rakhi Gifts", "rakhi-gifts", "gifts", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Rakhi Gifts & Hampers Online | Giftlaya", 52},
		{"Mixed Flowers", "mixed-flowers", "flowers", "product", "https://cdn.giftlaya.com/images/8/2e461552-a4d9-485b-b49d-9946424acc01.webp", "Mixed Flower Bouquets Online | Giftlaya", 53},
		{"Birthday Flowers", "flowers/birthday", "flowers", "product", "https://cdn.giftlaya.com/images/18/05f7cce4-65c3-45f8-858b-091e953d0f17.webp", "Birthday Flowers Delivery Online | Giftlaya", 54},
		{"Anniversary Flowers", "flowers/anniversary", "flowers", "product", "https://cdn.giftlaya.com/images/18/05f7cce4-65c3-45f8-858b-091e953d0f17.webp", "Anniversary Flowers & Bouquets | Giftlaya", 55},
		{"Wedding Flowers", "flowers/weddings", "flowers", "product", "https://cdn.giftlaya.com/images/18/05f7cce4-65c3-45f8-858b-091e953d0f17.webp", "Wedding Flowers & Garlands | Giftlaya", 56},
		{"Valentine's Day Flowers", "valentines-day/flowers", "valentines-day", "product", "https://cdn.giftlaya.com/images/18/05f7cce4-65c3-45f8-858b-091e953d0f17.webp", "Valentine's Day Flowers Delivery | Giftlaya", 57},
		{"Pink Roses", "roses/pink", "roses", "product", "https://cdn.giftlaya.com/images/18/05f7cce4-65c3-45f8-858b-091e953d0f17.webp", "Pink Rose Bouquets Online | Giftlaya", 58},
		{"Red Roses", "roses/red", "roses", "product", "https://cdn.giftlaya.com/images/18/05f7cce4-65c3-45f8-858b-091e953d0f17.webp", "Red Roses Bouquet Delivery | Giftlaya", 59},
		{"White Roses", "roses/white", "roses", "product", "https://cdn.giftlaya.com/images/18/05f7cce4-65c3-45f8-858b-091e953d0f17.webp", "White Rose Arrangements Online | Giftlaya", 60},
		{"Yellow Roses", "roses/yellow", "roses", "product", "https://cdn.giftlaya.com/images/23/60ceaa59-46b6-46c1-8773-c5029002d93e.webp", "Yellow Roses Online Delivery | Giftlaya", 61},
		{"Annaprashan Cakes", "cakes/annaprashan", "cakes", "product", "https://cdn.giftlaya.com/images/18/d104d837-4612-4ff7-9ea3-9b3d89c8bb37.webp", "Annaprashan Theme Cakes Online | Giftlaya", 62},
		{"Anniversary Cakes", "cakes/anniversary", "cakes", "product", "https://cdn.giftlaya.com/images/18/f21557ab-1b4c-418e-bf0a-a263ad5d5756.webp", "Anniversary Cakes Delivery | Giftlaya", 63},
		{"25th Anniversary Cakes", "cakes/anniversary/for-25th", "cakes/anniversary", "product", "https://cdn.giftlaya.com/images/18/f21557ab-1b4c-418e-bf0a-a263ad5d5756.webp", "25th Anniversary Cakes Online | Giftlaya", 64},
		{"Anniversary Cakes for Parents", "cakes/anniversary/for-parents", "cakes/anniversary", "product", "https://cdn.giftlaya.com/images/18/f21557ab-1b4c-418e-bf0a-a263ad5d5756.webp", "Anniversary Cakes for Parents | Giftlaya", 65},
		{"Birthday Cakes", "cakes/birthday", "cakes", "product", "https://cdn.giftlaya.com/images/8/3ce928b9-d9f0-497e-813e-7e5b483fdf23.webp", "Birthday Cakes Same-Day Delivery | Giftlaya", 66},
		{"Engagement Cakes", "cakes/engagement", "cakes", "product", "https://cdn.giftlaya.com/images/93/70b9f0d0-132e-44cc-bb13-5e73a6bdc153.webp", "Designer Engagement Cakes Online | Giftlaya", 67},
		{"Wedding Cakes", "cakes/wedding", "cakes", "product", "https://cdn.giftlaya.com/images/93/70b9f0d0-132e-44cc-bb13-5e73a6bdc153.webp", "Multi-Tier Wedding Cakes Online | Giftlaya", 68},
		{"Eggless Cakes", "cakes/eggless", "cakes", "product", "https://cdn.giftlaya.com/images/8/3ce928b9-d9f0-497e-813e-7e5b483fdf23.webp", "100% Eggless Fresh Cakes Online | Giftlaya", 69},
		{"Half Cakes", "cakes/half-cakes", "cakes", "product", "https://cdn.giftlaya.com/images/93/868b5486-7688-4689-bf72-9f2e7bf2a5d5.webp", "Half Birthday & Celebration Cakes | Giftlaya", 70},
		{"Multi-Tier Cakes", "cakes/multi-tier", "cakes", "product", "https://cdn.giftlaya.com/images/93/70b9f0d0-132e-44cc-bb13-5e73a6bdc153.webp", "Multi-Tier Designer Cakes | Giftlaya", 71},
		{"Sugarfree Cakes", "cakes/sugarfree", "cakes", "product", "https://cdn.giftlaya.com/images/8/3ce928b9-d9f0-497e-813e-7e5b483fdf23.webp", "Sugar-Free Healthy Cakes Online | Giftlaya", 72},
		{"Black Forest Cakes", "cakes/black-forest", "cakes", "product", "https://cdn.giftlaya.com/images/18/8c8c0255-1743-4255-aff9-8e103c927f19.webp", "Black Forest Cakes Delivery | Giftlaya", 73},
		{"Butterscotch Cakes", "cakes/butterscotch", "cakes", "product", "https://cdn.giftlaya.com/images/8/3ce928b9-d9f0-497e-813e-7e5b483fdf23.webp", "Crunchy Butterscotch Cakes Online | Giftlaya", 74},
		{"Chocolate Cakes", "cakes/chocolate-cake", "cakes", "product", "https://cdn.giftlaya.com/images/18/8c8c0255-1743-4255-aff9-8e103c927f19.webp", "Rich Chocolate Cakes Online | Giftlaya", 75},
		{"Fruit Cakes", "cakes/fruit-cake", "cakes", "product", "https://cdn.giftlaya.com/images/59/8507b617-56c6-4aea-bedc-0e968dc703b0.webp", "Fresh Fruit Cakes Online | Giftlaya", 76},
		{"Rasmalai Cakes", "cakes/rasmalai-cake", "cakes", "product", "https://cdn.giftlaya.com/16/creamy-rasmalai-half-kg-cake-1788251915630-590880.webp", "Creamy Rasmalai Cakes Online | Giftlaya", 77},
		{"Red Velvet Cakes", "cakes/red-velvet", "cakes", "product", "https://cdn.giftlaya.com/images/18/f21557ab-1b4c-418e-bf0a-a263ad5d5756.webp", "Red Velvet Cakes Online Delivery | Giftlaya", 78},
		{"Truffle Cakes", "cakes/truffle-cakes", "cakes", "product", "https://cdn.giftlaya.com/images/18/8c8c0255-1743-4255-aff9-8e103c927f19.webp", "Belgian Chocolate Truffle Cakes | Giftlaya", 79},
		{"Vanilla Cakes", "cakes/vanilla-cakes", "cakes", "product", "https://cdn.giftlaya.com/images/8/3ce928b9-d9f0-497e-813e-7e5b483fdf23.webp", "Classic Vanilla Cream Cakes | Giftlaya", 80},
		{"Couple T-Shirts", "custom-t-shirts/for-couples", "custom-t-shirts", "product", "https://cdn.giftlaya.com/images/18/5bf2fad6-cfe9-4a1c-aa91-1c6bfd28ecb1.webp", "Couple Personalized T-Shirts Online | Giftlaya", 81},
		{"Annaprashan Decorations", "annaprashan-decorations", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/0b7fb0ec-bbcc-4e67-a6bc-f3d3e0062da1.webp", "Annaprashan Ceremony Decoration at Home | Giftlaya", 82},
		{"Bride To Be Decoration", "bride-to-be-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/674e4dbe-bb27-4e90-b46e-ed1151d7a116.webp", "Bride To Be Bachelorette Decoration | Giftlaya", 83},
		{"Bride Welcome Decoration", "bride-welcome-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/674e4dbe-bb27-4e90-b46e-ed1151d7a116.webp", "Griha Pravesh Bride Welcome Decoration | Giftlaya", 84},
		{"Cabana Decoration", "cabana-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/d74b7199-6fe3-46a0-8a98-ca91a5d453c6.webp", "Private Cabana Setup & Decoration | Giftlaya", 85},
		{"Canopy Decorations", "canopy-decorations", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/d74b7199-6fe3-46a0-8a98-ca91a5d453c6.webp", "Romantic Canopy Setup & Decoration | Giftlaya", 86},
		{"Car Boot Decoration", "car-boot-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/674e4dbe-bb27-4e90-b46e-ed1151d7a116.webp", "Surprise Car Boot Decoration | Giftlaya", 87},
		{"Ceremony Decoration", "ceremony-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/6a7681e0-d719-4413-b4bc-c95292e1d4aa.webp", "Traditional Ceremony Decorations | Giftlaya", 88},
		{"Mundan Ceremony Decoration", "ceremony-decoration/mundan", "ceremony-decoration", "decoration", "https://cdn.giftlaya.com/images/93/0b7fb0ec-bbcc-4e67-a6bc-f3d3e0062da1.webp", "Mundan Ceremony Decor at Home | Giftlaya", 89},
		{"Christening Decorations", "christening-decorations", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/0b7fb0ec-bbcc-4e67-a6bc-f3d3e0062da1.webp", "Christening & Baptism Decoration | Giftlaya", 90},
		{"Christmas Decorations", "christmas-decorations", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/8/722a2647-8cdf-4026-8534-339df33d20b0.webp", "Christmas Office & Home Decoration | Giftlaya", 91},
		{"Cradle Ceremony Decoration", "cradle-ceremony-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/0b7fb0ec-bbcc-4e67-a6bc-f3d3e0062da1.webp", "Traditional Cradle Ceremony Decoration | Giftlaya", 92},
		{"Dohale Jevan Decoration", "dohale-jevan", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/674e4dbe-bb27-4e90-b46e-ed1151d7a116.webp", "Dohale Jevan Baby Shower Decor | Giftlaya", 93},
		{"Engagement Ring Platter", "engagement-ring-platter", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/6a7681e0-d719-4413-b4bc-c95292e1d4aa.webp", "Custom Engagement Ring Platters | Giftlaya", 94},
		{"Festival Decorations", "festival-decorations", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/6a7681e0-d719-4413-b4bc-c95292e1d4aa.webp", "Festival Home & Office Decoration | Giftlaya", 95},
		{"First Night Decorations", "first-night-decorations", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/d74b7199-6fe3-46a0-8a98-ca91a5d453c6.webp", "Romantic First Night Bedroom Decor | Giftlaya", 96},
		{"Flower Decoration", "flower-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/6a7681e0-d719-4413-b4bc-c95292e1d4aa.webp", "Fresh Flower Venue & Home Decoration | Giftlaya", 97},
		{"Mehndi Decoration", "mehndi-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/6a7681e0-d719-4413-b4bc-c95292e1d4aa.webp", "Mehndi Ceremony Marigold & Floral Decor | Giftlaya", 98},
		{"Mundan Decoration", "mundan-ceremony-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/0b7fb0ec-bbcc-4e67-a6bc-f3d3e0062da1.webp", "Mundan Sanskar Home Decoration | Giftlaya", 99},
		{"Naming Ceremony Decoration", "naming-ceremony-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/0b7fb0ec-bbcc-4e67-a6bc-f3d3e0062da1.webp", "Baby Naming Ceremony Decoration | Giftlaya", 100},
		{"Office Decorations", "office-decorations", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/8/722a2647-8cdf-4026-8534-339df33d20b0.webp", "Corporate Office Party Decoration | Giftlaya", 101},
		{"Proposal Decoration", "proposal-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/d74b7199-6fe3-46a0-8a98-ca91a5d453c6.webp", "Romantic Marry Me Proposal Setup | Giftlaya", 102},
		{"Room Decorations", "room-decorations", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/240db990-f274-42f4-820e-8c53ff548b22.webp", "Surprise Room Balloon Decoration | Giftlaya", 103},
		{"Stage Decorations", "stage-decorations", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/6a7681e0-d719-4413-b4bc-c95292e1d4aa.webp", "Event & Reception Stage Decoration | Giftlaya", 104},
		{"Terrace Decorations", "terrace-decorations", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/d74b7199-6fe3-46a0-8a98-ca91a5d453c6.webp", "Rooftop & Terrace Surprise Decoration | Giftlaya", 105},
		{"Trousseau Trays", "trays", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/6a7681e0-d719-4413-b4bc-c95292e1d4aa.webp", "Decorative Wedding & Festive Trays | Giftlaya", 106},
		{"Wedding Car Decoration", "wedding-car-decoration", "balloon-decorations", "decoration", "https://cdn.giftlaya.com/images/93/674e4dbe-bb27-4e90-b46e-ed1151d7a116.webp", "Fresh Floral Wedding Car Decoration | Giftlaya", 107},
		{"Kids Activities", "kids-activities", "birthday-decoration", "decoration", "https://cdn.giftlaya.com/images/93/77543e69-0000-47b3-a447-e2ad42b57268.webp", "Kids Party Magician, Tattoo & Game Host | Giftlaya", 108},
		{"Anniversary Gifts", "gifts/anniversary", "gifts", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Anniversary Gifts Online India | Giftlaya", 109},
		{"Baby Shower Gifts", "gifts/baby-shower", "gifts", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Baby Shower Gift Hampers Online | Giftlaya", 110},
		{"Christmas Day Gifts", "gifts/christmas-day", "gifts", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Christmas Gifts & Hampers Online | Giftlaya", 111},
		{"Diwali Gifts", "gifts/diwali", "gifts", "product", "https://cdn.giftlaya.com/images/8/77eda5ba-a668-4a5d-a01e-b9a8279a4dd6.webp", "Diwali Corporate & Family Gift Hampers | Giftlaya", 112},
		{"Engagement Gifts", "gifts/engagement", "gifts", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Engagement Gifts for Couples | Giftlaya", 113},
		{"Father's Day Gifts", "gifts/fathers-day", "gifts", "product", "https://cdn.giftlaya.com/images/8/a110487f-5fc4-42c6-b99d-098de429eb73.webp", "Father's Day Gifts Online India | Giftlaya", 114},
		{"Gifts for Boss", "gifts/for-boss", "gifts", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Executive & Boss Gift Hampers | Giftlaya", 115},
		{"Gifts for Boyfriend", "gifts/for-boyfriend", "gifts", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Romantic Gifts for Boyfriend | Giftlaya", 116},
		{"Gifts for Brother", "gifts/for-brother", "gifts", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Gifts for Brother Online | Giftlaya", 117},
		{"Gifts for Dad", "gifts/for-dad", "gifts", "product", "https://cdn.giftlaya.com/images/8/a110487f-5fc4-42c6-b99d-098de429eb73.webp", "Best Gifts for Dad Online | Giftlaya", 118},
		{"Gifts for Girlfriend", "gifts/for-girlfriend", "gifts", "product", "https://cdn.giftlaya.com/images/18/05f7cce4-65c3-45f8-858b-091e953d0f17.webp", "Unique Gifts for Girlfriend | Giftlaya", 119},
		{"Gifts for Husband", "gifts/for-husband", "gifts", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Surprise Gifts for Husband | Giftlaya", 120},
		{"Gifts for Mom", "gifts/for-mom", "gifts", "product", "https://cdn.giftlaya.com/images/18/05f7cce4-65c3-45f8-858b-091e953d0f17.webp", "Special Gifts for Mom Online | Giftlaya", 121},
		{"Gifts for Sister", "gifts/for-sister", "gifts", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Thoughtful Gifts for Sister | Giftlaya", 122},
		{"Gifts for Teachers", "gifts/for-teachers", "gifts", "product", "https://cdn.giftlaya.com/images/8/392615d8-f1cc-462a-a8cd-e2884f2ba305.webp", "Appreciation Gifts for Teachers | Giftlaya", 123},
		{"Gifts for Wife", "gifts/for-wife", "gifts", "product", "https://cdn.giftlaya.com/images/18/05f7cce4-65c3-45f8-858b-091e953d0f17.webp", "Romantic Gifts for Wife Online | Giftlaya", 124},
		{"Friendship Day Gifts", "gifts/friendship-day", "gifts", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Friendship Day Gifts & Hampers | Giftlaya", 125},
		{"Housewarming Gifts", "gifts/housewarming", "gifts", "product", "https://cdn.giftlaya.com/images/8/392615d8-f1cc-462a-a8cd-e2884f2ba305.webp", "Housewarming Plants & Gifts | Giftlaya", 126},
		{"I Am Sorry Gifts", "gifts/i-am-sorry-gifts", "gifts", "product", "https://cdn.giftlaya.com/images/18/05f7cce4-65c3-45f8-858b-091e953d0f17.webp", "I Am Sorry Flowers & Cakes | Giftlaya", 127},
		{"Karwa Chauth Gifts", "gifts/karwa-chauth", "gifts", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Karwa Chauth Gifts & Sargi Hampers | Giftlaya", 128},
		{"Mother's Day Gifts", "gifts/mothers-day", "gifts", "product", "https://cdn.giftlaya.com/images/18/05f7cce4-65c3-45f8-858b-091e953d0f17.webp", "Mother's Day Flowers & Cakes | Giftlaya", 129},
		{"New Year Gifts", "gifts/new-year", "gifts", "product", "https://cdn.giftlaya.com/images/8/77eda5ba-a668-4a5d-a01e-b9a8279a4dd6.webp", "New Year Gift Hampers Online | Giftlaya", 130},
		{"Retirement Gifts", "gifts/retirement", "gifts", "product", "https://cdn.giftlaya.com/images/8/392615d8-f1cc-462a-a8cd-e2884f2ba305.webp", "Retirement & Farewell Gifts | Giftlaya", 131},
		{"Thank You Gifts", "gifts/thank-you", "gifts", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Thank You Bouquets & Hampers | Giftlaya", 132},
		{"Valentine's Day Gifts", "gifts/valentines-day", "gifts", "product", "https://cdn.giftlaya.com/images/18/05f7cce4-65c3-45f8-858b-091e953d0f17.webp", "Valentine's Day Gifts for Partners | Giftlaya", 133},
		{"Wedding Gifts", "gifts/wedding", "gifts", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Wedding Gift Hampers for Couples | Giftlaya", 134},
		{"Welcome Baby Gifts", "gifts/welcome-baby", "gifts", "product", "https://cdn.giftlaya.com/images/8/70297d78-a523-4956-acc0-7e8bb7095474.webp", "Welcome Baby Celebration Gifts | Giftlaya", 135},
		{"Send Flowers from USA", "send-flowers-to-india-from-usa", "flowers", "product", "https://cdn.giftlaya.com/images/8/2e461552-a4d9-485b-b49d-9946424acc01.webp", "Send Flowers to India from USA | Giftlaya", 136},
		{"Send Flowers from UK", "send-flowers-to-india-from-uk", "flowers", "product", "https://cdn.giftlaya.com/images/8/2e461552-a4d9-485b-b49d-9946424acc01.webp", "Send Flowers to India from UK | Giftlaya", 137},
		{"Send Flowers from Canada", "send-flowers-to-india-from-canada", "flowers", "product", "https://cdn.giftlaya.com/images/8/2e461552-a4d9-485b-b49d-9946424acc01.webp", "Send Flowers to India from Canada | Giftlaya", 138},
		{"Send Flowers from UAE", "send-flowers-to-india-from-uae", "flowers", "product", "https://cdn.giftlaya.com/images/8/2e461552-a4d9-485b-b49d-9946424acc01.webp", "Send Flowers to India from UAE | Giftlaya", 139},
		{"Send Flowers from Australia", "send-flowers-to-india-from-australia", "flowers", "product", "https://cdn.giftlaya.com/images/8/2e461552-a4d9-485b-b49d-9946424acc01.webp", "Send Flowers to India from Australia | Giftlaya", 140},
		{"Send Flowers from Singapore", "send-flowers-to-india-from-singapore", "flowers", "product", "https://cdn.giftlaya.com/images/8/2e461552-a4d9-485b-b49d-9946424acc01.webp", "Send Flowers to India from Singapore | Giftlaya", 141},
		{"Send Flowers from Saudi Arabia", "send-flowers-to-india-from-saudi-arabia", "flowers", "product", "https://cdn.giftlaya.com/images/8/2e461552-a4d9-485b-b49d-9946424acc01.webp", "Send Flowers to India from Saudi Arabia | Giftlaya", 142},
		{"Send Flowers from Qatar", "send-flowers-to-india-from-qatar", "flowers", "product", "https://cdn.giftlaya.com/images/8/2e461552-a4d9-485b-b49d-9946424acc01.webp", "Send Flowers to India from Qatar | Giftlaya", 143},
		{"Send Flowers from Kuwait", "send-flowers-to-india-from-kuwait", "flowers", "product", "https://cdn.giftlaya.com/images/8/2e461552-a4d9-485b-b49d-9946424acc01.webp", "Send Flowers to India from Kuwait | Giftlaya", 144},
		{"Send Flowers from New Zealand", "send-flowers-to-india-from-new-zealand", "flowers", "product", "https://cdn.giftlaya.com/images/8/2e461552-a4d9-485b-b49d-9946424acc01.webp", "Send Flowers to India from New Zealand | Giftlaya", 145},
		{"Chocolates & Cupcakes", "addon-chocolates-cupcakes", "", "addon", "", "Sweet Addons & Cupcakes", 13},
		{"Lights & Balloons", "addon-lights-balloons", "", "addon", "", "Fairy Lights & Balloon Addons", 14},
		{"Greeting Cards & Wraps", "addon-greeting-cards", "", "addon", "", "Handwritten Cards & Luxury Wraps", 15},
		{"Cakes", "addon-cakes", "", "addon", "", "Cake Addons", 16},
		{"Bento Cakes", "addon-bento-cakes", "", "addon", "", "Bento Cake Addons", 17},
		{"Chocolates", "addon-chocolates", "", "addon", "", "Chocolate Addons", 18},
		{"Balloon Bouquets", "addon-balloon-bouquets", "", "addon", "", "Balloon Bouquet Addons", 19},
		{"Enhancements", "addon-enhancements", "", "addon", "", "Enhancement Addons", 20},
	}
	for pass := 0; pass < 2; pass++ {
		for _, sc := range subCats {
			var parentArg *int64
			if sc.ParentSlug != "" {
				if pid := catIDs[sc.ParentSlug]; pid > 0 {
					parentArg = &pid
				}
			}
			seoDesc := ""
			seoHtml := ""
			if sc.Kind != "addon" {
				seoDesc = fmt.Sprintf("Order %s online with same-day and midnight delivery across 100+ cities in India by Giftlaya.", sc.Name)
				seoHtml = fmt.Sprintf("<h2>%s Online Delivery Across India</h2><p>Explore curated %s crafted fresh for birthdays, anniversaries, and family celebrations. Giftlaya offers reliable 2-hour delivery slots, transparent pricing, and dedicated support across 100+ cities.</p>", sc.Name, strings.ToLower(sc.Name))
			}
			var sid int64
			_ = pool.QueryRow(ctx, `
				INSERT INTO categories (parent_id, name, slug, kind, image_url, seo_title, seo_description, seo_content_html, sort_order, is_active)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE)
				ON CONFLICT (slug) DO UPDATE SET
					parent_id = COALESCE(categories.parent_id, EXCLUDED.parent_id),
					image_url = COALESCE(NULLIF(categories.image_url,''), EXCLUDED.image_url),
					seo_description = COALESCE(NULLIF(categories.seo_description,''), EXCLUDED.seo_description),
					seo_content_html = COALESCE(NULLIF(categories.seo_content_html,''), EXCLUDED.seo_content_html)
				RETURNING id
			`, parentArg, sc.Name, sc.Slug, sc.Kind, sc.Img, sc.SeoTitle, seoDesc, seoHtml, sc.Order).Scan(&sid)
			if sid > 0 {
				catIDs[sc.Slug] = sid
			}
		}
	}
	// Populate SEO descriptions & rich guide HTML for root categories if still empty
	_, _ = pool.Exec(ctx, `
		UPDATE categories
		SET seo_description = COALESCE(NULLIF(seo_description,''), 'Order ' || name || ' online with same-day and midnight delivery across 100+ Indian cities by Giftlaya.'),
		    seo_content_html = COALESCE(NULLIF(seo_content_html,''), '<h2>' || name || ' Online Delivery Across India</h2><p>Browse handcrafted ' || LOWER(name) || ' delivered in convenient 2-hour slots across India by Giftlaya.</p>')
		WHERE kind <> 'addon' AND (COALESCE(seo_description,'') = '' OR COALESCE(seo_content_html,'') = '')
	`)

	// 4. Products (from storefront products.json & extraCatalog.json)
	type jsonProd struct {
		ID            string  `json:"id"`
		Title         string  `json:"title"`
		Slug          string  `json:"slug"`
		Image         string  `json:"image"`
		Price         float64 `json:"price"`
		OriginalPrice float64 `json:"originalPrice"`
		DeliveryTag   string  `json:"deliveryTag"`
		Rating        float64 `json:"rating"`
		ReviewsCount  int     `json:"reviewsCount"`
	}
	var pDoc struct {
		Trending          []jsonProd `json:"trending"`
		TopSellingCakes   []jsonProd `json:"topSellingCakes"`
		PersonalizedGifts []jsonProd `json:"personalizedGifts"`
		Plants            []jsonProd `json:"plants"`
	}
	_ = readJSON("products.json", &pDoc)

	var exDoc struct {
		Flowers     []jsonProd `json:"flowers"`
		Decorations []jsonProd `json:"decorations"`
	}
	_ = readJSON("extraCatalog.json", &exDoc)

	seedProdGroup := func(list []jsonProd, pType, catSlug string, trending, featured bool) {
		for idx, jp := range list {
			if jp.Slug == "" || jp.Title == "" {
				continue
			}
			sellPaise := int64(jp.Price * 100)
			if sellPaise <= 0 {
				sellPaise = 99900
			}
			mrpPaise := int64(jp.OriginalPrice * 100)
			if mrpPaise < sellPaise {
				mrpPaise = sellPaise
			}
			sku := strings.ToUpper(fmt.Sprintf("GL-%s-%d", strings.ToUpper(pType[:min(3, len(pType))]), idx+101))
			sku = fmt.Sprintf("%s-%s", sku, strings.ToUpper(jp.Slug[:min(6, len(jp.Slug))]))
			leadDays := 0
			if strings.Contains(strings.ToLower(jp.DeliveryTag), "ship") {
				leadDays = 4
			}
			rating := jp.Rating
			if rating <= 0 {
				rating = 4.8
			}
			var pid int64
			err := pool.QueryRow(ctx, `
				INSERT INTO products (
					product_type, name, slug, sku, description, mrp_paise, selling_price_paise,
					stock_qty, track_stock, is_eggless, lead_time_days, gst_rate_percent,
					available_all_cities, is_featured, is_trending, status, seo_title, rating_avg, ratings_count
				) VALUES ($1,$2,$3,$4,$5,$6,$7,40,TRUE,$8,$9,18.00,TRUE,$10,$11,'published',$12,$13,$14)
				ON CONFLICT (slug) DO UPDATE SET selling_price_paise = EXCLUDED.selling_price_paise, mrp_paise = EXCLUDED.mrp_paise
				RETURNING id
			`, pType, jp.Title, jp.Slug, sku, fmt.Sprintf("<p>%s handcrafted and delivered fresh by Giftlaya.</p>", jp.Title),
				mrpPaise, sellPaise, pType == "cake", leadDays, featured, trending, jp.Title+" | Giftlaya", rating, max(12, jp.ReviewsCount)).Scan(&pid)
			if err != nil {
				continue
			}
			if jp.Image != "" {
				_, _ = pool.Exec(ctx, `
					INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
					SELECT $1, $2, $3, 0, TRUE
					WHERE NOT EXISTS (SELECT 1 FROM product_images WHERE product_id = $1)
				`, pid, jp.Image, jp.Title)
			}
			if cid, ok := catIDs[catSlug]; ok {
				_, _ = pool.Exec(ctx, `INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, pid, cid)
			}
			low := strings.ToLower(jp.Title)
			if catSlug == "balloon-decorations" {
				if cid, ok := catIDs["birthday-decoration"]; ok {
					_, _ = pool.Exec(ctx, `INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, pid, cid)
				}
				if (strings.Contains(low, "kid") || strings.Contains(low, "cocomelon") || strings.Contains(low, "jungle") || strings.Contains(low, "theme")) && catIDs["birthday-decoration/kids"] > 0 {
					_, _ = pool.Exec(ctx, `INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, pid, catIDs["birthday-decoration/kids"])
				}
				if strings.Contains(low, "anniversary") && catIDs["anniversary-decoration"] > 0 {
					_, _ = pool.Exec(ctx, `INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, pid, catIDs["anniversary-decoration"])
				}
			} else if catSlug == "flowers" && strings.Contains(low, "rose") && catIDs["roses"] > 0 {
				_, _ = pool.Exec(ctx, `INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, pid, catIDs["roses"])
			} else if catSlug == "cakes" && strings.Contains(low, "chocolate") && catIDs["chocolate-cakes"] > 0 {
				_, _ = pool.Exec(ctx, `INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, pid, catIDs["chocolate-cakes"])
			}
		}
	}

	seedProdGroup(pDoc.Trending, "combo", "trending", true, true)
	seedProdGroup(pDoc.TopSellingCakes, "cake", "cakes", true, true)
	seedProdGroup(pDoc.PersonalizedGifts, "personalised", "custom", false, true)
	seedProdGroup(pDoc.Plants, "plant", "plants", false, false)
	seedProdGroup(exDoc.Flowers, "flower", "flowers", true, true)
	seedProdGroup(exDoc.Decorations, "decoration_package", "balloon-decorations", true, true)

	// Link products to new section pages & bind navigation_items -> category_id
	for _, linkRule := range [][2]string{
		{"trending", "gifts"},
		{"custom", "personalized-gifts"},
		{"chocolate-cakes", "cakes/chocolate-cake"},
		{"personalized-photo-frames", "personalised-photo-frames"},
		{"flowers", "valentines-day"},
		{"flowers", "mixed-flowers"},
		{"balloon-decorations", "balloon-bouquets"},
		{"trending", "combos"},
		{"trending", "gift-hampers"},
		{"trending", "chocolates"},
	} {
		srcID := catIDs[linkRule[0]]
		dstID := catIDs[linkRule[1]]
		if srcID > 0 && dstID > 0 {
			_, _ = pool.Exec(ctx, `
				INSERT INTO product_categories (product_id, category_id)
				SELECT product_id, $2 FROM product_categories WHERE category_id = $1
				ON CONFLICT DO NOTHING
			`, srcID, dstID)
		}
	}
	_, _ = pool.Exec(ctx, `
		UPDATE navigation_items ni
		SET category_id = c.id
		FROM categories c
		WHERE ni.category_id IS NULL
		  AND LOWER(TRIM(BOTH '/' FROM ni.href)) = LOWER(c.slug)
	`)

	// 5. Hero Banners
	var banCount int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM hero_banners`).Scan(&banCount)
	if banCount == 0 {
		var bDoc struct {
			HeroBanners []struct {
				Href         string `json:"href"`
				Label        string `json:"label"`
				DesktopImage string `json:"desktopImage"`
				MobileImage  string `json:"mobileImage"`
			} `json:"heroBanners"`
		}
		_ = readJSON("banners.json", &bDoc)
		for i, b := range bDoc.HeroBanners {
			_, _ = pool.Exec(ctx, `
				INSERT INTO hero_banners (title, href, desktop_image_url, mobile_image_url, sort_order, is_active)
				VALUES ($1,$2,$3,$4,$5,TRUE)
			`, b.Label, b.Href, b.DesktopImage, b.MobileImage, i+1)
		}
	}

	// 6. Homepage Builder Sections (full 12 Giftlaya sections when initializing)
	sections := []struct {
		Key      string
		Type     string
		Title    string
		Subtitle string
		Slider   bool
		Rule     string
		Order    int
	}{
		{"shop_by_category", "category_strip", "Shop by category", "Find a little joy for every occasion.", false, `{"mode":"rule","category_slug":"shop-by-category","limit":8}`, 1},
		{"trending_gifts", "product_row", "Trending Gifts on Giftlaya", "Wide Range of Options", true, `{"mode":"rule","category_slug":"trending","limit":10}`, 2},
		{"fresh_flowers_row", "category_strip", "Fresh Flower Delivery in India", "Make their day bloom with joy", false, `{"mode":"rule","category_slug":"fresh-flowers","limit":6}`, 3},
		{"cake_delivery_row", "category_strip", "30 Mins Cake Delivery in India", "Fresh Cake Doorstep Delivery", true, `{"mode":"rule","category_slug":"cake-delivery","limit":8}`, 4},
		{"best_decorations", "decor_grid", "Try Our Best Decoration", "Decoration you will love", true, `{"mode":"rule","category_slug":"best-decorations","limit":8}`, 5},
		{"top_selling_cakes", "product_row", "Top-Selling Cakes", "Same-day delivery", true, `{"mode":"rule","category_slug":"cakes","limit":10}`, 6},
		{"best_sellers_cakes", "banner_strip", "Try Our Best Sellers Categories", "Cakes you will love", true, `{"mode":"rule","category_slug":"best-sellers-cakes","limit":6}`, 7},
		{"personalized_gifts", "product_row", "Personalized Gifts That Feel Special", "Custom mugs, T-shirts, frames, LED lamps, and more", true, `{"mode":"rule","category_slug":"custom","limit":10}`, 8},
		{"personalized_occasions", "category_strip", "Personalized Gifts for Every Occasion", "Crafted Just for You", true, `{"mode":"rule","category_slug":"personalized-occasions","limit":8}`, 9},
		{"green_plants", "product_row", "Indoor & Outdoor Plants Online in India", "Fresh Air Always", false, `{"mode":"rule","category_slug":"plants","limit":8}`, 10},
		{"corporate_banner", "banner_strip", "Corporate Gifting", "Thoughtful Gifts, Stronger Relationships.", false, `{"mode":"rule","category_slug":"corporate-gift","limit":1}`, 11},
		{"customer_reviews", "testimonials", "Customer Reviews", "Little moments, shared", true, `{"mode":"rule","limit":9}`, 12},
	}
	for _, s := range sections {
		_, _ = pool.Exec(ctx, `
			INSERT INTO homepage_sections (section_key, section_type, title, subtitle, slider_enabled, rule_config_json, sort_order, is_active)
			VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,TRUE)
			ON CONFLICT (section_key) DO UPDATE SET
				section_type = EXCLUDED.section_type,
				title = CASE WHEN homepage_sections.title IN (
					'Trending Gifts', 'Fresh Flowers for Every Mood', 'Try Our Best Balloon Decorations',
					'Personalised Keepsakes & Photo Gifts', 'Indoor Plants & Lucky Greens', ''
				) THEN EXCLUDED.title ELSE homepage_sections.title END,
				subtitle = COALESCE(NULLIF(homepage_sections.subtitle,''), EXCLUDED.subtitle),
				rule_config_json = EXCLUDED.rule_config_json,
				sort_order = EXCLUDED.sort_order
		`, s.Key, s.Type, s.Title, s.Subtitle, s.Slider, s.Rule, s.Order)
	}

	// 7. Coupons & Site Settings & Templates & FAQs & Reviews & Seller & Decorator Team
	_, _ = pool.Exec(ctx, `
		INSERT INTO coupons (code, description, discount_type, discount_value, min_cart_paise, max_discount_paise, valid_from, valid_until, is_active)
		VALUES
		  ('FESTIVE400', 'Festive offer: 4% off up to ₹400 on orders above ₹2,500.', 'percent', 4, 250000, 40000, NOW() - INTERVAL '1 day', NOW() + INTERVAL '365 days', TRUE),
		  ('HELLO50', '₹50 off on orders above ₹1,200. A little extra on every celebration.', 'flat', 50, 120000, NULL, NOW() - INTERVAL '1 day', NOW() + INTERVAL '365 days', TRUE),
		  ('FIRST100', '₹100 off your first Giftlaya order above ₹1,999.', 'flat', 100, 199900, NULL, NOW() - INTERVAL '1 day', NOW() + INTERVAL '365 days', TRUE),
		  ('NEWUSER', 'Use code NEWUSER at checkout and enjoy ₹100 off on your order. Hurry, limited time offer!', 'flat', 100, 199900, NULL, NOW() - INTERVAL '1 day', NOW() + INTERVAL '365 days', TRUE),
		  ('GIFT100', '₹100 off on orders above ₹2,500. Apply GIFT100 at checkout.', 'flat', 100, 250000, NULL, NOW() - INTERVAL '1 day', NOW() + INTERVAL '365 days', TRUE),
		  ('GIFT200', '₹200 off on orders above ₹5,000. Apply GIFT200 at checkout.', 'flat', 200, 500000, NULL, NOW() - INTERVAL '1 day', NOW() + INTERVAL '365 days', TRUE),
		  ('GIFT400', '₹400 off on orders above ₹10,000. Perfect for bulk & corporate gifting.', 'flat', 400, 1000000, NULL, NOW() - INTERVAL '1 day', NOW() + INTERVAL '365 days', TRUE),
		  ('GIFT10', '10% off on orders above ₹999', 'percent', 10, 99900, 50000, NOW() - INTERVAL '1 day', NOW() + INTERVAL '365 days', TRUE),
		  ('WELCOME150', 'Flat ₹150 off on first order above ₹1,299', 'flat', 150, 129900, NULL, NOW() - INTERVAL '1 day', NOW() + INTERVAL '365 days', TRUE)
		ON CONFLICT (code) DO NOTHING
	`)

	for _, st := range [][3]string{
		{"general_info", "general", `{"site_name":"Giftlaya","theme_color":"#9b1b45","phone":"+91 81002 48353","announcement":"Same-day flowers, cakes & balloon decoration across 100+ cities!","maintenance":false}`},
		{"tax_gst", "commerce", `{"gstin":"19AABCG1234F1Z2","legal_name":"Giftlaya Celebrations Pvt Ltd","default_rate":18}`},
		{"cancellation_rules", "commerce", `{"cutoff_hours":24,"fee_percent":25}`},
		{"coins_config", "commerce", `{"earn_percent":10,"expiry_days":180,"max_redeem_percent":25}`},
		{"header_config", "content", `{"logo_text":"Giftlaya","show_city_selector":true,"search_placeholder":"Search cakes, flowers, balloon decor...","hotline":"+91 81002 48353","top_strip_enabled":true}`},
		{"footer_config", "content", `{"copyright":"© 2026 Giftlaya. Made for your happy moments.","support_email":"support@giftlaya.com","address":"Salt Lake Sector V, Kolkata, WB","instagram":"https://www.instagram.com/giftlayaofficial/","facebook":"https://www.facebook.com/Giftlayaco/","youtube":"https://www.youtube.com/channel/UCMnCWe4Mn5AcC5T8Q0Jil4g","x_url":"https://x.com/giftlaya","linkedin":"https://in.linkedin.com/company/giftlaya-com","show_payment_badges":true,"columns":[{"title":"Policy Info","links":[{"label":"Terms & Conditions","href":"/pages/terms-and-conditions"},{"label":"Privacy Policy","href":"/pages/privacy-policy"},{"label":"Disclaimer","href":"/pages/disclaimer"},{"label":"Shipping Policy","href":"/pages/shipping-policy"},{"label":"Cancellation Policy","href":"/pages/cancellation-and-return"},{"label":"Refund Policy","href":"/pages/refund-policy"},{"label":"Return Policy","href":"/pages/return-policy"}]},{"title":"About Company","links":[{"label":"About Us","href":"/about-us"},{"label":"Latest Blogs","href":"/blog"},{"label":"Contact Us","href":"/contact-us"},{"label":"Sitemap","href":"/sitemap.xml"},{"label":"Giftlaya UAE","href":"https://giftlaya.ae/"}]}]}`},
		{"category_page_config", "content", `{"show_breadcrumbs":true,"default_sort":"popular","show_faq_block":true,"show_city_pills":true,"trust_strip":"100% On-Time · Trained Decorators · Fresh Blooms"}`},
		{"mobile_categories_config", "content", `{"items":[{"title":"Birthday","slug":"birthday-decoration","badge":"POPULAR"},{"title":"Anniversary","slug":"anniversary-decoration","badge":"TRENDING"},{"title":"Flowers","slug":"flowers","badge":"2HR"},{"title":"Cakes","slug":"cakes","badge":"EGGLESS"},{"title":"Baby Shower","slug":"welcome-baby","badge":""}]}`},
		{"seller_categories_config", "seller", `{"items":[{"slug":"flowers","name":"Fresh Flowers & Bouquets","commission_percent":18,"gst_percent":5,"is_active":true},{"slug":"cakes","name":"Designer & Photo Cakes","commission_percent":20,"gst_percent":5,"is_active":true},{"slug":"balloon-decorations","name":"Balloon & Room Decorations","commission_percent":15,"gst_percent":18,"is_active":true},{"slug":"custom","name":"Personalised Gifts & Mugs","commission_percent":18,"gst_percent":18,"is_active":true},{"slug":"plants","name":"Indoor Plants & Succulents","commission_percent":16,"gst_percent":5,"is_active":true}]}`},
		{"login_methods", "system", `{"otp_whatsapp":true,"otp_sms":true,"email_password":true,"google_oauth":false,"guest_checkout":true,"session_days":30}`},
		{"phone_config", "system", `{"primary_phone":"+91 81002 48353","whatsapp_phone":"+91 81002 48353","calling_number":"8100248353","whatsapp_number":"8100248353","primary_is":"calling","show_floating_whatsapp":true,"show_floating_call":true,"support_hours":"08:00 AM - 11:00 PM IST"}`},
		{"meta_pixel_config", "system", `{"pixel_id":"109823456712345","capi_enabled":false,"ga4_id":"G-GIFTLAYA01","track_purchase":true,"track_add_to_cart":true,"domain_verify_tag":""}`},
		{"announcement_config", "system", `{"enabled":true,"bg_color":"#9b1b45","text_color":"#ffffff","text":"Flat 10% OFF with code GIFT10 · Same-Day Delivery across 88+ Cities!","cta_label":"Explore","cta_url":"/collections/birthday-decoration"}`},
		{"universal_product_image_config", "system", `{"fallback_image_url":"/placeholder-product.webp","badge_position":"top-left","auto_webp":true,"watermark_enabled":false}`},
		{"universal_banner_config", "system", `{"enabled":true,"desktop_url":"/hero-universal.webp","mobile_url":"/hero-universal-mob.webp","target_url":"/collections/anniversary-decoration"}`},
		{"push_config", "system", `{"fcm_enabled":true,"web_push_enabled":true,"vapid_public_key":"BEl62iUYgUivxIkv69yViEuiBIa","default_icon":"/icon-192.png"}`},
		{"push_notifications_log", "system", `{"items":[{"id":1,"title":"Weekend Decor Sale","body":"Book balloon decor today & earn 10% coins!","segment":"All Subscribers","sent_at":"2026-11-09T10:30:00Z","recipients":1240}]}`},
		{"mobile_app_config", "mobile", `{"maintenance":false,"min_version_android":"2.4.0","min_version_ios":"2.4.0","force_update":false,"play_store_url":"https://play.google.com/store/apps/details?id=com.giftlaya","app_store_url":""}`},
		{"mobile_app_home", "mobile", `{"home_banner_text":"Book Same-Day Decor in 60 Seconds","show_story_strip":true,"sections":["hero","quick_cats","trending_decor","cakes_flowers","recent_works"]}`},
		{"mobile_app_categories", "mobile", `{"layout":"grid_4","featured_slugs":["birthday-decoration","anniversary-decoration","cakes","flowers","plants"]}`},
		{"whatsapp_quick_replies", "whatsapp", `{"items":[{"id":1,"shortcut":"/thanks","title":"Thank You Note","body":"Thank you for choosing Giftlaya! Let us know how we can help make your celebration special."},{"id":2,"shortcut":"/slot","title":"Slot Confirmation","body":"Your preferred 2-hour decoration slot is available! Please share your pincode to lock it."},{"id":3,"shortcut":"/delay","title":"Traffic Update","body":"Our delivery partner / decorator team is 15 mins away and will call on arrival."}]}`},
		{"meta_ads_audiences", "ads", `{"items":[{"id":1,"name":"Cart Abandoners (7 Days)","type":"Custom","size_est":4200,"status":"active"},{"id":2,"name":"Repeat Gift Buyers (India)","type":"Lookalike 1%","size_est":185000,"status":"active"}]}`},
		{"meta_ads_catalog", "ads", `{"feed_enabled":true,"feed_url":"/api/v1/public/products?limit=100","sync_frequency":"hourly","exclude_out_of_stock":true}`},
		{"meta_ads_rules", "ads", `{"items":[{"id":1,"name":"Pause High CPA","condition":"CPA > INR 450 over 3d","action":"Pause Ad Set","enabled":true},{"id":2,"name":"Scale Top ROAS","condition":"ROAS >= 4.0","action":"Increase budget 15%","enabled":true}]}`},
		{"recent_work_categories", "content", `{"items":[{"name":"Birthday Decoration","slug":"birthday-decoration"},{"name":"Anniversary Room Decor","slug":"anniversary-room-decor"},{"name":"Welcome Baby","slug":"welcome-baby"},{"name":"Kids Theme Decor","slug":"kids-theme-decor"}]}`},
	} {
		_, _ = pool.Exec(ctx, `
			INSERT INTO site_settings (key, group_name, value_json)
			VALUES ($1, $2, $3::jsonb) ON CONFLICT (key) DO NOTHING
		`, st[0], st[1], st[2])
	}
	// Ensure legacy seeded minimal footer_config upgrades to full 7-link Policy Info + 5-link About Company,
	// and upgrade placeholder hotline (+91-9876543210) to official Giftlaya helpline (8100248353).
	_, _ = pool.Exec(ctx, `
		UPDATE site_settings
		SET value_json = '{"copyright":"© 2026 Giftlaya. Made for your happy moments.","support_email":"support@giftlaya.com","address":"Salt Lake Sector V, Kolkata, WB","instagram":"https://www.instagram.com/giftlayaofficial/","facebook":"https://www.facebook.com/Giftlayaco/","youtube":"https://www.youtube.com/channel/UCMnCWe4Mn5AcC5T8Q0Jil4g","x_url":"https://x.com/giftlaya","linkedin":"https://in.linkedin.com/company/giftlaya-com","show_payment_badges":true,"columns":[{"title":"Policy Info","links":[{"label":"Terms & Conditions","href":"/pages/terms-and-conditions"},{"label":"Privacy Policy","href":"/pages/privacy-policy"},{"label":"Disclaimer","href":"/pages/disclaimer"},{"label":"Shipping Policy","href":"/pages/shipping-policy"},{"label":"Cancellation Policy","href":"/pages/cancellation-and-return"},{"label":"Refund Policy","href":"/pages/refund-policy"},{"label":"Return Policy","href":"/pages/return-policy"}]},{"title":"About Company","links":[{"label":"About Us","href":"/about-us"},{"label":"Latest Blogs","href":"/blog"},{"label":"Contact Us","href":"/contact-us"},{"label":"Sitemap","href":"/sitemap.xml"},{"label":"Giftlaya UAE","href":"https://giftlaya.ae/"}]}]}'::jsonb
		WHERE key = 'footer_config' AND NOT (value_json::text LIKE '%Policy Info%')
	`)
	_, _ = pool.Exec(ctx, `
		UPDATE site_settings SET value_json = REPLACE(value_json::text, '+91-9876543210', '+91 81002 48353')::jsonb
		WHERE key IN ('phone_config', 'header_config', 'general_info') AND value_json::text LIKE '%+91-9876543210%'
	`)
	_, _ = pool.Exec(ctx, `
		UPDATE site_settings
		SET value_json = '{"primary_phone":"+91 81002 48353","whatsapp_phone":"+91 81002 48353","calling_number":"8100248353","whatsapp_number":"8100248353","primary_is":"calling","show_floating_whatsapp":true,"show_floating_call":true,"support_hours":"08:00 AM - 11:00 PM IST"}'::jsonb
		WHERE key = 'phone_config' AND NOT (value_json::text LIKE '%calling_number%')
	`)
	if rawBanners, err := os.ReadFile(filepath.Join(dataDir, "banners.json")); err == nil {
		var bd struct {
			CorporateBanner json.RawMessage `json:"corporateBanner"`
		}
		if json.Unmarshal(rawBanners, &bd) == nil && len(bd.CorporateBanner) > 0 {
			_, _ = pool.Exec(ctx, `
				INSERT INTO site_settings (key, group_name, value_json) VALUES ('corporate_banner_config', 'content', $1::jsonb)
				ON CONFLICT (key) DO NOTHING
			`, string(bd.CorporateBanner))
		}
	}
	if rawExplore, err := os.ReadFile(filepath.Join(dataDir, "exploreLinks.json")); err == nil && len(rawExplore) > 0 {
		_, _ = pool.Exec(ctx, `
			INSERT INTO site_settings (key, group_name, value_json) VALUES ('explore_links_config', 'content', $1::jsonb)
			ON CONFLICT (key) DO NOTHING
		`, string(rawExplore))
	}
	var catTilesDoc struct {
		ShopByCategory        json.RawMessage `json:"shopByCategory"`
		FreshFlowers          json.RawMessage `json:"freshFlowers"`
		Cakes30Mins           json.RawMessage `json:"cakes30Mins"`
		BestDecorations       json.RawMessage `json:"bestDecorations"`
		BestSellerCakes       json.RawMessage `json:"bestSellerCakes"`
		PersonalizedOccasions json.RawMessage `json:"personalizedOccasions"`
	}
	if readJSON("categories.json", &catTilesDoc) {
		tilesPayload, _ := json.Marshal(map[string]json.RawMessage{
			"shop-by-category":       catTilesDoc.ShopByCategory,
			"fresh-flowers":          catTilesDoc.FreshFlowers,
			"cake-delivery":          catTilesDoc.Cakes30Mins,
			"best-decorations":       catTilesDoc.BestDecorations,
			"best-sellers-cakes":     catTilesDoc.BestSellerCakes,
			"personalized-occasions": catTilesDoc.PersonalizedOccasions,
		})
		_, _ = pool.Exec(ctx, `
			INSERT INTO site_settings (key, group_name, value_json) VALUES ('home_tiles_config', 'content', $1::jsonb)
			ON CONFLICT (key) DO NOTHING
		`, string(tilesPayload))
	}
	if rawSeoBytes, err := os.ReadFile(filepath.Join(dataDir, "seoContentRaw.html")); err == nil && len(rawSeoBytes) > 0 {
		seoPayload, _ := json.Marshal(map[string]string{
			"title": "More about gifting with Giftlaya",
			"html":  strings.TrimSpace(string(rawSeoBytes)),
		})
		_, _ = pool.Exec(ctx, `
			INSERT INTO site_settings (key, group_name, value_json) VALUES ('home_seo_guide', 'content', $1::jsonb)
			ON CONFLICT (key) DO NOTHING
		`, string(seoPayload))
	}

	// Default structured presets for all Catalog Preset types + Option Groups + Info Field Groups
	defaultPresets := [][4]string{
		{"option_group", "Cake Weight Tiers", "cake-weight-tiers", `{"type":"radio","required":true,"options":[{"label":"500g","price_delta_paise":0},{"label":"1 Kg","price_delta_paise":55000},{"label":"2 Kg","price_delta_paise":140000}]}`},
		{"option_group", "Rose Stem Count", "rose-stem-count", `{"type":"radio","required":true,"options":[{"label":"12 Roses","price_delta_paise":0},{"label":"24 Roses","price_delta_paise":49900},{"label":"50 Roses","price_delta_paise":119900}]}`},
		{"info_field_group", "Cake Message & Flavor", "cake-message-flavor", `{"fields":[{"key":"cake_message","label":"Message on Cake","type":"text","required":false,"placeholder":"Happy Birthday!"},{"key":"photo_print","label":"Photo Upload","type":"photo","required":false}]}`},
		{"info_field_group", "Neon Name & Celebration Date", "neon-name-date", `{"fields":[{"key":"custom_name","label":"Name for Neon / Foil","type":"text","required":true},{"key":"celebration_date","label":"Celebration Date","type":"text","required":false}]}`},
		{"advance-payment", "50% Advance Booking", "50-percent-advance", `{"percent":50}`},
		{"ai-tags", "Romantic Rose Room", "romantic-rose-room", `{"weight":95}`},
		{"balloon-color", "Metallic Rose Gold", "metallic-rose-gold", `{"hex":"#B76E79"}`},
		{"balloon-color", "Pastel Lilac", "pastel-lilac", `{"hex":"#C8A2C8"}`},
		{"cancellation-policy", "Standard Decor Policy (24h / 25%)", "standard-decor-24h-25", `{"cutoff_hours":24,"fee_percent":25}`},
		{"care-info", "Keep flowers in cool shade & refresh water", "fresh-flower-care", `{"instructions":"Trim stems 1cm at a 45-degree angle daily."}`},
		{"color", "Crimson Velvet", "crimson-velvet", `{"hex":"#9B1B45"}`},
		{"delivery-info", "Decorator reaches within selected 2h slot", "decor-2h-slot", `{"note":"Setup takes 45-60 minutes."}`},
		{"delivery-type", "Same-Day 2-Hour Express", "same-day-2hr", `{"lead_days":0,"cutoff":"17:00"}`},
		{"enhancement", "LED Fairy Lights Curtain", "led-fairy-lights", `{"extra_paise":29900}`},
		{"faq", "Can balloon colours be customised?", "customise-balloon-colours", `{"answer":"Yes, choose your preferred colours on the product page or in order notes."}`},
		{"flavour", "Belgian Dark Chocolate Truffle", "belgian-dark-chocolate", `{}`},
		{"gst", "GST 18% (Services & Decor)", "gst-18", `{"rate_percent":18,"hsn":"998599"}`},
		{"label", "Bestseller", "bestseller", `{"bg":"#4F6EF7"}`},
		{"meta-description-template", "City Decor Meta Description", "city-decor-meta-desc", `{"template":"Book {{category}} in {{city}} with same-day setup by Giftlaya."}`},
		{"meta-title-template", "City Decor Meta Title", "city-decor-meta-title", `{"template":"{{category}} in {{city}} | Giftlaya"}`},
		{"occasion", "Birthday", "birthday", `{}`},
		{"occasion", "Anniversary", "anniversary", `{}`},
		{"processing-time", "2 Hours", "2-hours-ready", `{"hours":2,"name":"2 Hours","time":2}`},
		{"processing-time", "3 Hours", "3-hours-ready", `{"hours":3,"name":"3 Hours","time":3}`},
		{"processing-time", "4 Hours", "4-hours-ready", `{"hours":4,"name":"4 Hours","time":4}`},
		{"processing-time", "6 Hours", "6-hours-ready", `{"hours":6,"name":"6 Hours","time":6}`},
		{"processing-time", "8 Hours", "8-hours-ready", `{"hours":8,"name":"8 Hours","time":8}`},
		{"processing-time", "10 Hours", "10-hours-ready", `{"hours":10,"name":"10 Hours","time":10}`},
		{"processing-time", "12 Hours", "12-hours-ready", `{"hours":12,"name":"12 Hours","time":12}`},
		{"processing-time", "24 Hours", "24-hours-ready", `{"hours":24,"name":"24 Hours","time":24}`},
		{"processing-time", "48 Hours", "48-hours-ready", `{"hours":48,"name":"48 Hours","time":48}`},
		{"processing-time", "72 Hours", "72-hours-ready", `{"hours":72,"name":"72 Hours","time":72}`},
		{"processing-time", "120 Hours", "120-hours-ready", `{"hours":120,"name":"120 Hours","time":120}`},
		{"processing-time", "144 Hours", "144-hours-ready", `{"hours":144,"name":"144 Hours","time":144}`},
		{"promotion-tags", "Extra 10% Coins Back", "extra-10-coins", `{"badge":"COINS 10%"}`},
		{"quick-links", "Same Day Balloon Decor", "quick-same-day-decor", `{"href":"/collections/birthday-decoration"}`},
		{"relation", "For Partner / Spouse", "for-partner", `{}`},
		{"trending-searches", "Rose Gold Birthday Decor", "rose-gold-birthday", `{"href":"/search?q=rose+gold"}`},
		{"unit", "Set of 1", "set-of-1", `{"short":"set"}`},
		{"venue", "Bedroom / Home Room", "bedroom-home", `{}`},
	}
	for i, pr := range defaultPresets {
		_, _ = pool.Exec(ctx, `
			INSERT INTO presets (preset_type, name, slug, metadata, sort_order, is_active)
			VALUES ($1,$2,$3,$4::jsonb,$5,TRUE) ON CONFLICT (preset_type, slug) DO NOTHING
		`, pr[0], pr[1], pr[2], pr[3], i+1)
	}

	var navCnt, navChildCnt int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM navigation_items`).Scan(&navCnt)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM navigation_items WHERE parent_id IS NOT NULL`).Scan(&navChildCnt)
	if navCnt == 0 || (navCnt <= 6 && navChildCnt == 0) {
		var navDoc []struct {
			Title   string  `json:"title"`
			Href    string  `json:"href"`
			Badge   *string `json:"badge"`
			Columns []struct {
				Title string `json:"title"`
				Links []struct {
					Label string  `json:"label"`
					Href  string  `json:"href"`
					Badge *string `json:"badge"`
				} `json:"links"`
			} `json:"columns"`
		}
		if readJSON("navigation.json", &navDoc) && len(navDoc) > 0 {
			if navCnt <= 6 && navChildCnt == 0 {
				_, _ = pool.Exec(ctx, `DELETE FROM navigation_items`)
			}
			for i, root := range navDoc {
				var parentID int64
				if err := pool.QueryRow(ctx, `
					INSERT INTO navigation_items (column_title, label, href, badge, sort_order, is_active)
					VALUES ('Top Level', $1, $2, $3, $4, TRUE) RETURNING id
				`, root.Title, root.Href, root.Badge, i+1).Scan(&parentID); err == nil && parentID > 0 {
					sortIdx := 1
					for _, col := range root.Columns {
						for _, lk := range col.Links {
							_, _ = pool.Exec(ctx, `
								INSERT INTO navigation_items (parent_id, column_title, label, href, badge, sort_order, is_active)
								VALUES ($1, $2, $3, $4, $5, $6, TRUE)
							`, parentID, col.Title, lk.Label, lk.Href, lk.Badge, sortIdx)
							sortIdx++
						}
					}
				}
			}
		}
	}

	var blogCatCnt int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM blog_categories`).Scan(&blogCatCnt)
	if blogCatCnt == 0 {
		_, _ = pool.Exec(ctx, `
			INSERT INTO blog_categories (name, slug, seo_title, seo_description)
			VALUES
			  ('Celebration Ideas', 'celebration-ideas', 'Celebration & Party Ideas', 'Top balloon and room decoration ideas.'),
			  ('Gifting Guides', 'gifting-guides', 'Gifting Guides by Occasion', 'Thoughtful flower, cake & personalised gift guides.')
			ON CONFLICT (slug) DO NOTHING
		`)
		_, _ = pool.Exec(ctx, `
			INSERT INTO blog_posts (title, slug, excerpt, content_html, featured_image_url, author_name, read_time, is_featured, status, published_at)
			VALUES
			(
			  'Common Balloon Decoration Mistakes to Avoid at Home Parties',
			  'common-balloon-decoration-mistakes-to-avoid-for-home-parties',
			  'Discover the most frequent balloon setup mistakes people make during home birthday and anniversary celebrations, and practical ways to get a clean, studio-finish arch every time.',
			  '<p>Avoid over-inflating foil balloons, mixing mismatched tones, or taping arches directly onto freshly painted walls.</p>',
			  'https://cdn.giftlaya.com/images/4/3fef7955-87df-4e55-9d0b-79a683145b79.webp',
			  'Atik', '5 min read', TRUE, 'published', NOW()
			),
			(
			  '10 Romantic Anniversary Room Decoration Ideas at Home',
			  '10-romantic-anniversary-room-decoration-ideas',
			  'Transform your bedroom with rose petals, warm fairy lights and metallic balloons.',
			  '<p>Plan an unforgettable surprise with coordinated pastel & chrome balloons, LED tea lights, and photo memories.</p>',
			  'https://cdn.giftlaya.com/images/62/2eadf002-1535-47b0-9489-7edfb9ad5c6d.webp',
			  'Giftlaya Editorial', '4 min read', FALSE, 'published', NOW()
			) ON CONFLICT (slug) DO NOTHING
		`)
	}
	// Parity backfill for featured blog image & key PDP multi-images/ratings/inclusions/personalization/addons
	_, _ = pool.Exec(ctx, `
		UPDATE product_addons pa SET addon_category_id = c.id
		FROM categories c
		WHERE pa.addon_category_id IS NULL AND c.kind = 'addon' AND (
			(pa.slug LIKE '%cupcake%' AND c.slug = 'addon-chocolates-cupcakes') OR
			(pa.slug LIKE '%fairy%' AND c.slug = 'addon-lights-balloons') OR
			(pa.slug LIKE '%card%' AND c.slug = 'addon-greeting-cards')
		)
	`)
	_, _ = pool.Exec(ctx, `
		INSERT INTO blog_posts (title, slug, excerpt, content_html, featured_image_url, author_name, read_time, is_featured, status, published_at)
		VALUES (
			'Common Balloon Decoration Mistakes to Avoid at Home Parties',
			'common-balloon-decoration-mistakes-to-avoid-for-home-parties',
			'Discover the most frequent balloon setup mistakes people make during home birthday and anniversary celebrations, and practical ways to get a clean, studio-finish arch every time.',
			'<p>Avoid over-inflating foil balloons, mixing mismatched tones, or taping arches directly onto freshly painted walls.</p>',
			'https://cdn.giftlaya.com/images/4/3fef7955-87df-4e55-9d0b-79a683145b79.webp',
			'Atik', '5 min read', TRUE, 'published', NOW()
		)
		ON CONFLICT (slug) DO UPDATE SET
			featured_image_url = CASE WHEN COALESCE(blog_posts.featured_image_url, '') = '' THEN EXCLUDED.featured_image_url ELSE blog_posts.featured_image_url END,
			is_featured = TRUE
	`)
	_, _ = pool.Exec(ctx, `
		UPDATE blog_posts SET featured_image_url = 'https://cdn.giftlaya.com/images/62/2eadf002-1535-47b0-9489-7edfb9ad5c6d.webp'
		WHERE slug = '10-romantic-anniversary-room-decoration-ideas' AND (COALESCE(featured_image_url, '') = '' OR featured_image_url LIKE '%240db990-f274-42f4-820e-8c53ff548b22%')
	`)
	// Seed Add-ons BEFORE product_addon_links so fresh runs link them cleanly
	for _, ad := range []struct {
		Name, Slug, CatSlug, Img string
		PricePaise               int64
	}{
		{"Choco Lava Cupcake Pair", "choco-lava-cupcake-pair", "addon-cakes", "https://cdn.giftlaya.com/images/23/80465938-3259-4be2-98d2-91d49863bf9c.webp", 19900},
		{"Warm White LED Fairy String Lights", "warm-white-led-fairy-lights", "addon-lights-balloons", "https://cdn.giftlaya.com/images/4/6855517e-2f48-49e7-9f64-e3c0cf3c0ac4.webp", 14900},
		{"Handwritten Luxury Greeting Card", "handwritten-luxury-greeting-card", "addon-greeting-cards", "https://cdn.giftlaya.com/images/27/a5679686-d714-4d95-af8a-e471a697a660.webp", 9900},
		{"Single Fresh Red Rose Wrap", "single-fresh-red-rose-wrap", "addon-enhancements", "https://cdn.giftlaya.com/images/23/83b37500-6a95-4330-b894-73d82eedd1a5.webp", 14900},
		{"Flower and Half kg Cake Combo", "flower-and-half-kg-cake-combo-addon", "addon-cakes", "https://cdn.giftlaya.com/16/flower-and-half-kg-cake-combo-1788251758317-390903.webp", 199900},
		{"Red Velvet Half kg Cake", "red-velvet-half-kg-cake-addon", "addon-cakes", "https://cdn.giftlaya.com/16/red-velvet-half-kg-cake-1788248779946-799737.webp", 149900},
		{"Heart Shape Half Kg Cake", "heart-shape-half-kg-cake-addon", "addon-cakes", "https://cdn.giftlaya.com/16/heart-shape-half-kg-cake-1788251700135-168864.webp", 179900},
		{"Delicious Kitkat Half kg Cake", "delicious-kitkat-half-kg-cake-addon", "addon-cakes", "https://cdn.giftlaya.com/16/delicious-kitkat-half-kg-cake-1788251866183-89103.webp", 169900},
		{"Creamy Rasmalai Half kg Cake", "creamy-rasmalai-half-kg-cake-addon", "addon-cakes", "https://cdn.giftlaya.com/16/creamy-rasmalai-half-kg-cake-1788251915630-590880.webp", 179900},
		{"Mini Delight Cake", "mini-delight-cake-addon", "addon-bento-cakes", "https://cdn.giftlaya.com/16/mini-delight-cake-1788254858321-618984.webp", 89900},
		{"Love Bento Cake", "love-bento-cake-addon", "addon-bento-cakes", "https://cdn.giftlaya.com/16/love-bento-cake-1788254999719-691428.webp", 99900},
		{"Cuddly Duo Bento Cake", "cuddly-duo-bento-cake-addon", "addon-bento-cakes", "https://cdn.giftlaya.com/16/cuddly-duo-bento-cake-1788259690601-621425.webp", 109900},
		{"Ferrero Rocher (4 Pcs)", "ferrero-rocher-4-pcs-addon", "addon-chocolates", "https://cdn.giftlaya.com/16/ferrero-rocher-4-pcs-1788154527557-975782.webp", 24900},
		{"Ferrero Rocher (16 Pcs)", "ferrero-rocher-16-pcs-addon", "addon-chocolates", "https://cdn.giftlaya.com/16/ferrero-rocher-24-pcs-1788154763320-702256.webp", 84900},
		{"Ferrero Rocher (24 Pcs)", "ferrero-rocher-24-pcs-addon", "addon-chocolates", "https://cdn.giftlaya.com/16/ferrero-rocher-24-pcs-1788154763320-702256.webp", 119900},
		{"Dairy Milk Silk (45g)", "dairy-milk-silk-45g-addon", "addon-chocolates", "https://cdn.giftlaya.com/16/floral-choco-1788154053826-979166.webp", 14900},
		{"Surprise Balloon Bouquet", "surprise-balloon-bouquet-addon", "addon-balloon-bouquets", "https://cdn.giftlaya.com/images/4/f3a524d5-531f-4771-bf30-a8e214472a3b.webp", 149900},
	} {
		var catArg *int64
		if cid := catIDs[ad.CatSlug]; cid > 0 {
			catArg = &cid
		}
		_, _ = pool.Exec(ctx, `
			INSERT INTO product_addons (addon_category_id, name, slug, image_url, price_paise, is_active)
			VALUES ($1,$2,$3,$4,$5,TRUE)
			ON CONFLICT (slug) DO UPDATE SET
				addon_category_id = COALESCE(product_addons.addon_category_id, EXCLUDED.addon_category_id),
				image_url = CASE WHEN product_addons.image_url = '' OR product_addons.image_url LIKE '%240db990%' THEN EXCLUDED.image_url ELSE product_addons.image_url END
		`, catArg, ad.Name, ad.Slug, ad.Img, ad.PricePaise)
	}

	for _, pr := range []struct {
		Slug        string
		Rating      float64
		Count       int
		VegNonVeg   bool
		Imgs        []string
		Inclusions  []string
		CustomLabel string
		CustomKey   string
		CustomPh    string
	}{
		{
			Slug: "yellow-roses-with-cake", Rating: 4.9, Count: 70,
			Imgs:       []string{"https://cdn.giftlaya.com/images/23/60ceaa59-46b6-46c1-8773-c5029002d93e.webp"},
			Inclusions: []string{"10 Yellow Roses", "Black Forest Cake (500gm)", "Serves - 4–6 people", "Black & White Wrapping Paper", "White Ribbon"},
		},
		{
			Slug: "chocolate-fruity-cake", Rating: 4.8, Count: 99, VegNonVeg: true,
			Imgs:       []string{"https://cdn.giftlaya.com/images/59/8507b617-56c6-4aea-bedc-0e968dc703b0.webp"},
			Inclusions: []string{"Cake Flavor - Chocolate", "Type of Cake - Cream", "Weight - Half Kg", "Serves - 4-6 People", "Toppings - Fresh Fruits"},
			CustomKey: "cake_message", CustomLabel: "Message on Cake", CustomPh: "Happy Birthday, Happy Anniversary...",
		},
		{
			Slug: "custom-photo-printed-mug", Rating: 5.0, Count: 70,
			Imgs:       []string{"https://cdn.giftlaya.com/images/27/640b8f81-e6aa-4ebc-9e62-c7dc348c315e.webp"},
			Inclusions: []string{"Ceramic Coffee mug", "Custom Text & Image for Print", "Color - Yellow", "Capacity - 300 ml"},
			CustomKey: "mug_text", CustomLabel: "Text on Mug", CustomPh: "Enter text on mug",
		},
	} {
		var pid int64
		if err := pool.QueryRow(ctx, `UPDATE products SET rating_avg = $2, ratings_count = $3, has_veg_nonveg = ($4 OR has_veg_nonveg) WHERE slug = $1 RETURNING id`, pr.Slug, pr.Rating, pr.Count, pr.VegNonVeg).Scan(&pid); err == nil && pid > 0 {
			for idx, imgURL := range pr.Imgs {
				_, _ = pool.Exec(ctx, `
					INSERT INTO product_images (product_id, url, is_primary, sort_order)
					SELECT $1, $2, FALSE, $3
					WHERE NOT EXISTS (SELECT 1 FROM product_images WHERE product_id = $1 AND url = $2)
				`, pid, imgURL, idx+2)
			}
			var incCnt int
			_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM decoration_inclusions WHERE product_id = $1`, pid).Scan(&incCnt)
			if incCnt == 0 {
				for idx, it := range pr.Inclusions {
					_, _ = pool.Exec(ctx, `INSERT INTO decoration_inclusions (product_id, kind, item_text, sort_order) VALUES ($1,'included',$2,$3)`, pid, it, idx)
				}
			}
			if pr.CustomLabel != "" {
				var pfCnt int
				_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM product_personalization_fields WHERE product_id = $1`, pid).Scan(&pfCnt)
				if pfCnt == 0 {
					_, _ = pool.Exec(ctx, `INSERT INTO product_personalization_fields (product_id, field_key, label, field_type, placeholder, is_required, sort_order) VALUES ($1,$2,$3,'text',$4,FALSE,0)`, pid, pr.CustomKey, pr.CustomLabel, pr.CustomPh)
				}
			}
			var adLinkCnt int
			_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM product_addon_links WHERE product_id = $1`, pid).Scan(&adLinkCnt)
			if adLinkCnt == 0 {
				_, _ = pool.Exec(ctx, `INSERT INTO product_addon_links (product_id, addon_id) SELECT $1, id FROM product_addons WHERE is_active = TRUE LIMIT 5 ON CONFLICT DO NOTHING`, pid)
			}
			var prodRevCnt int
			_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM reviews WHERE product_id = $1`, pid).Scan(&prodRevCnt)
			if prodRevCnt == 0 {
				_, _ = pool.Exec(ctx, `
					INSERT INTO reviews (product_id, reviewer_name, city_name, rating, comment, status, is_featured_home)
					VALUES
					  ($1, 'Ananya Chatterjee', 'Kolkata', 5, 'Super fresh and delivered right on time in the chosen 2-hour slot!', 'approved', FALSE),
					  ($1, 'Rohan Mehta', 'Mumbai', 5, 'Packaging and taste were spot-on. Looked identical to the photos.', 'approved', FALSE)
				`, pid)
			}
		}
	}

	// Ensure cake products have weight variants (Half Kg, 1 Kg, 2 Kg)
	if cakeRows, qErr := pool.Query(ctx, `SELECT id, selling_price_paise, mrp_paise FROM products WHERE product_type = 'cake' AND deleted_at IS NULL`); qErr == nil {
		type cakeInfo struct {
			ID, Price, MRP int64
		}
		var cakes []cakeInfo
		for cakeRows.Next() {
			var c cakeInfo
			if cakeRows.Scan(&c.ID, &c.Price, &c.MRP) == nil {
				cakes = append(cakes, c)
			}
		}
		cakeRows.Close()
		for _, ck := range cakes {
			var vCnt int
			_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM product_variants WHERE product_id = $1`, ck.ID).Scan(&vCnt)
			if vCnt == 0 {
				mrpBase := max(ck.MRP, ck.Price)
				for _, vr := range []struct {
					Label, Suffix string
					Delta         int64
				}{
					{"Half Kg", "500G", 0},
					{"1 Kg", "1KG", 45000},
					{"2 Kg", "2KG", 110000},
				} {
					_, _ = pool.Exec(ctx, `
						INSERT INTO product_variants (product_id, label, sku_suffix, mrp_paise, price_paise, stock_qty, is_active)
						VALUES ($1,$2,$3,$4,$5,50,TRUE)
					`, ck.ID, vr.Label, vr.Suffix, mrpBase+vr.Delta, ck.Price+vr.Delta)
				}
			}
		}
	}

	var rwCnt int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM recent_works`).Scan(&rwCnt)
	if rwCnt == 0 {
		var cityIDArg *int64
		if firstCityID > 0 {
			cityIDArg = &firstCityID
		}
		_, _ = pool.Exec(ctx, `
			INSERT INTO recent_works (title, category_slug, city_id, image_url, description, sort_order, is_published)
			VALUES ('Rose Gold Pastel Arch at ITC Royal, Kolkata', 'birthday-decoration', $1, 'https://cdn.giftlaya.com/images/93/240db990-f274-42f4-820e-8c53ff548b22.webp', 'Completed in 55 mins by Kolkata Elite Decor Crew', 1, TRUE)
		`, cityIDArg)
	}

	// Backfill any unlinked orders into customers & coin_wallets
	_, _ = pool.Exec(ctx, `
		INSERT INTO customers (phone, name)
		SELECT DISTINCT TRIM(recipient_phone), COALESCE(NULLIF(TRIM(recipient_name), ''), TRIM(recipient_phone))
		FROM orders
		WHERE customer_id IS NULL AND TRIM(recipient_phone) <> ''
		ON CONFLICT (phone) DO NOTHING
	`)
	_, _ = pool.Exec(ctx, `
		INSERT INTO coin_wallets (customer_id, balance_coins)
		SELECT id, 0 FROM customers
		ON CONFLICT DO NOTHING
	`)
	_, _ = pool.Exec(ctx, `
		UPDATE orders o
		SET customer_id = c.id
		FROM customers c
		WHERE o.customer_id IS NULL AND TRIM(o.recipient_phone) = c.phone
	`)

	var inqCnt int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM contact_inquiries`).Scan(&inqCnt)
	if inqCnt == 0 {
		_, _ = pool.Exec(ctx, `
			INSERT INTO contact_inquiries (inquiry_type, name, phone, email, city, subject, message, status)
			VALUES
			  ('contact', 'Ananya Sharma', '+919830011223', 'ananya@example.com', 'Kolkata', 'Custom Corporate Gifting', 'Looking for 50 curated chocolate hampers for Diwali.', 'new'),
			  ('product_inquiry', 'Rohit Verma', '+919811122334', 'rohit@example.com', 'Delhi', 'Neon Sign Custom Text', 'Can we order a warm white custom couple name neon in 2 days?', 'new'),
			  ('franchise', 'Vikram Patel', '+919825012345', 'vikram@example.com', 'Ahmedabad', 'City Franchise Application', 'Interested in opening a Giftlaya decoration hub in Ahmedabad.', 'new'),
			  ('vendor_request', 'Bloom Craft Decorators', '+919874561230', 'team@bloomcraft.in', 'Mumbai', 'Decorator Team Onboarding', 'Experienced balloon & floral setup team covering Andheri & Bandra.', 'new')
		`)
	}

	var tkCnt int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM support_tickets`).Scan(&tkCnt)
	if tkCnt == 0 {
		_, _ = pool.Exec(ctx, `
			INSERT INTO support_tickets (ticket_number, source_type, subject, status, priority, messages_json)
			VALUES
			  ('TKT-1001', 'customer', 'Reschedule slot from 7 PM to 9 PM', 'open', 'high', '[{"sender":"customer","body":"Please move evening setup slot by 2 hours.","sent_at":"2026-11-10T09:00:00Z"}]'::jsonb),
			  ('TKT-1002', 'seller', 'GST payout invoice format update', 'open', 'medium', '[{"sender":"seller","body":"Need updated HSN code on weekly payout statement.","sent_at":"2026-11-10T08:15:00Z"}]'::jsonb)
			ON CONFLICT (ticket_number) DO NOTHING
		`)
	}

	var waCnt int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM whatsapp_contacts`).Scan(&waCnt)
	if waCnt == 0 {
		var waID int64
		_ = pool.QueryRow(ctx, `
			INSERT INTO whatsapp_contacts (phone, name, unread_count, last_message_at)
			VALUES ('+919830055443', 'Priya Sen (Kolkata)', 1, NOW())
			ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
		`).Scan(&waID)
		if waID > 0 {
			_, _ = pool.Exec(ctx, `
				INSERT INTO whatsapp_messages (contact_id, direction, body, status)
				VALUES ($1, 'in', 'Hi! Is midnight rose-gold balloon decor available in Salt Lake Sector V today?', 'received')
			`, waID)
		}
	}

	var adCnt int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM meta_ads_campaigns`).Scan(&adCnt)
	if adCnt == 0 {
		_, _ = pool.Exec(ctx, `
			INSERT INTO meta_ads_campaigns (external_campaign_id, name, objective, status, daily_budget_paise)
			VALUES ('cmp_decor_india_01', 'Birthday & Anniversary Decor Pan-India', 'CONVERSIONS', 'active', 250000)
			ON CONFLICT (external_campaign_id) DO NOTHING
		`)
	}

	var sellerCnt int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM sellers`).Scan(&sellerCnt)
	if sellerCnt == 0 {
		_, _ = pool.Exec(ctx, `
			INSERT INTO sellers (business_name, slug, contact_name, phone, email, commission_percent, kyc_status, is_active)
			VALUES
			  ('Royal Party Celebrations', 'royal-party-celebrations', 'Amit Roy', '+919831000111', 'amit@royalparty.in', 15.0, 'verified', TRUE),
			  ('Velvet Blooms Studio', 'velvet-blooms-studio', 'Neha Kapoor', '+919820000222', 'neha@velvetblooms.in', 18.0, 'pending', TRUE)
			ON CONFLICT (slug) DO NOTHING
		`)
	}

	for _, tpl := range [][4]string{
		{"order.placed", "whatsapp", "Order Placed {{order_id}}", "Hi {{name}}, thank you for ordering with Giftlaya! Order {{order_id}} received for slot {{slot}}."},
		{"order.confirmed", "whatsapp", "Order Confirmed {{order_id}}", "Hi {{name}}, your order {{order_id}} is confirmed for {{slot}}."},
		{"order.delivered", "whatsapp", "Delivered {{order_id}}", "Hi {{name}}, your Giftlaya surprise {{order_id}} was delivered!"},
	} {
		_, _ = pool.Exec(ctx, `
			INSERT INTO notification_templates (event_key, channel, subject, body_template, is_active)
			VALUES ($1,$2,$3,$4,TRUE) ON CONFLICT (event_key, channel) DO NOTHING
		`, tpl[0], tpl[1], tpl[2], tpl[3])
	}

	var faqCount int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM faqs`).Scan(&faqCount)
	if faqCount == 0 {
		var faqs []struct {
			Question string `json:"question"`
			Answer   string `json:"answer"`
		}
		if readJSON("faqs.json", &faqs) {
			for i, f := range faqs {
				_, _ = pool.Exec(ctx, `INSERT INTO faqs (scope_type, question, answer, sort_order, is_active) VALUES ('home',$1,$2,$3,TRUE)`, f.Question, f.Answer, i+1)
			}
		}
	}

	var revCount int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM reviews`).Scan(&revCount)
	if revCount == 0 {
		var revDoc struct {
			Reviews []struct {
				Name    string `json:"name"`
				City    string `json:"city"`
				Rating  int    `json:"rating"`
				Comment string `json:"comment"`
			} `json:"reviews"`
		}
		if readJSON("reviews.json", &revDoc) {
			for _, rv := range revDoc.Reviews {
				_, _ = pool.Exec(ctx, `INSERT INTO reviews (reviewer_name, city_name, rating, comment, status, is_featured_home) VALUES ($1,$2,$3,$4,'approved',TRUE)`, rv.Name, rv.City, rv.Rating, rv.Comment)
			}
		}
	}

	if firstCityID > 0 {
		var teamCount int
		_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM decorator_teams`).Scan(&teamCount)
		if teamCount == 0 {
			_, _ = pool.Exec(ctx, `INSERT INTO decorator_teams (city_id, name, phone, daily_capacity, is_active) VALUES ($1, 'Kolkata Elite Decor Crew', '+919800000001', 10, TRUE)`, firstCityID)
		}
	}

	// Default static & footer policy pages (rich structured HTML matching Giftlaya footer slugs)
	for _, pg := range [][4]string{
		{"about-us", "static", "About Giftlaya", `<h2>Every Occasion, Every City</h2><p>Founded in 2021 by Vishal Gupta, Giftlaya delivers fresh flowers, designer cakes, personalised keepsakes, and trained decorator setups across 100+ Indian cities with same-day and midnight delivery.</p>`},
		{"terms-and-conditions", "footer_policy", "Terms & Conditions", `<h2>1. Orders & Scheduling</h2><p>Same-day delivery slots and decoration setup timings depend on partner capacity and city coverage. Please verify pincode availability before checkout.</p><h2>2. Perishable & Custom Items</h2><p>Fresh cakes, floral arrangements, and hand-crafted personalised items may carry natural artisan variations while maintaining equivalent stem count, weight, and visual quality.</p><h2>3. Pricing & Payments</h2><p>All displayed prices include applicable GST unless stated otherwise at checkout.</p>`},
		{"privacy-policy", "footer_policy", "Privacy Policy", `<h2>1. Information We Collect</h2><p>We collect name, email, mobile number, delivery address, and customization notes strictly needed to fulfill your celebration orders reliably.</p><h2>2. Data Protection</h2><p>Giftlaya never sells customer contact details to third-party advertisers. Contact support@giftlaya.com or +91 81002 48353 for any privacy queries.</p>`},
		{"disclaimer", "footer_policy", "Disclaimer", `<h2>Visual Representation</h2><p>Product photography represents finished bouquets, cakes, gifts, and balloon setups handcrafted by studio partners. Minor seasonal colour substitutions of equal value ensure your celebration schedule is never delayed.</p>`},
		{"shipping-policy", "footer_policy", "Shipping Policy", `<h2>Same-Day & Midnight Delivery</h2><p>Cakes, fresh bouquets, and balloon decorations are delivered in your chosen 2-hour slot. Midnight slots arrive between 11:00 PM and 12:00 AM.</p><h2>Courier Dispatch</h2><p>Personalised mugs, frames, cushions, and apparel ship within 24–48 hours and arrive across India in 4–6 business days.</p>`},
		{"cancellation-and-return", "footer_policy", "Cancellation Policy", `<h2>Before Preparation</h2><p>Orders can be cancelled or rescheduled at least 24 hours prior to decoration setups or 6 hours prior to gift delivery slots via My Orders or +91 81002 48353.</p>`},
		{"refund-policy", "footer_policy", "Refund Policy", `<h2>Refund Timelines</h2><p>Approved refunds are initiated immediately and credited back to the original UPI, card, or bank account within 5–7 business days.</p>`},
		{"return-policy", "footer_policy", "Return Policy", `<h2>Damaged or Incorrect Orders</h2><p>Please share photos within 4 hours of delivery for fresh flowers/cakes, or within 48 hours for personalised courier gifts at support@giftlaya.com for instant replacement or resolution.</p>`},
		{"faqs", "footer_policy", "Frequently Asked Questions", `<h2>Orders, Delivery &amp; Setup Help</h2><p>Find answers on same-day slots, midnight celebrations, custom cakes, cancellation rules, and Giftlaya Coins rewards across India.</p>`},
		{"brands", "static", "Giftlaya Partner Brands", `<h2>Gifting Partner &amp; Corporate Solutions</h2><p>Giftlaya partners with curated florists, bakers, and certified decorators across 100+ cities in India.</p>`},
	} {
		_, _ = pool.Exec(ctx, `
			INSERT INTO cms_pages (slug, page_type, title, body_html, is_published)
			VALUES ($1,$2,$3,$4,TRUE)
			ON CONFLICT (slug) DO UPDATE SET
				body_html = CASE WHEN cms_pages.body_html LIKE '<h1>%<p>Official %' THEN EXCLUDED.body_html ELSE cms_pages.body_html END
		`, pg[0], pg[1], pg[2], pg[3])
	}

	if logger != nil {
		logger.Info("giftlaya catalog, cities, banners, homepage sections, FAQs & reviews seeded")
	}
}

