package service

import (
	"errors"
	"fmt"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/golang-jwt/jwt/v5"
)

type AdminAccessClaims struct {
	UserID    int64  `json:"uid"`
	Username  string `json:"username"`
	RoleSlug  string `json:"role"`
	SellerID  *int64 `json:"seller_id,omitempty"`
	Superuser bool   `json:"superuser"`
	jwt.RegisteredClaims
}

type TokenManager struct {
	accessSecret []byte
	accessTTL    time.Duration
}

func NewTokenManager(accessSecret string, accessTTL time.Duration) *TokenManager {
	return &TokenManager{
		accessSecret: []byte(accessSecret),
		accessTTL:    accessTTL,
	}
}

func (m *TokenManager) IssueAccessToken(profile domain.AdminProfile) (string, int64, error) {
	now := time.Now()
	exp := now.Add(m.accessTTL)
	claims := AdminAccessClaims{
		UserID:    profile.ID,
		Username:  profile.Username,
		RoleSlug:  profile.RoleSlug,
		SellerID:  profile.SellerID,
		Superuser: profile.Superuser,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprintf("%d", profile.ID),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
			Issuer:    "giftlaya-api",
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString(m.accessSecret)
	if err != nil {
		return "", 0, err
	}
	return signed, int64(m.accessTTL.Seconds()), nil
}

func (m *TokenManager) ParseAccessToken(tokenStr string) (*AdminAccessClaims, error) {
	parsed, err := jwt.ParseWithClaims(tokenStr, &AdminAccessClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return m.accessSecret, nil
	})
	if err != nil {
		return nil, domain.ErrUnauthorized
	}
	claims, ok := parsed.Claims.(*AdminAccessClaims)
	if !ok || !parsed.Valid {
		return nil, errors.Join(domain.ErrUnauthorized)
	}
	return claims, nil
}

