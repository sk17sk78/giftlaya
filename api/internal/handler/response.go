package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/go-playground/validator/v10"
)

var Validate = validator.New()

type ErrorResponse struct {
	Error string `json:"error"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

type PaginatedMeta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

func DecodeAndValidate(r *http.Request, dst any) error {
	defer r.Body.Close()
	body := io.LimitReader(r.Body, 1<<20) // 1 MB max JSON payload
	dec := json.NewDecoder(body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	return Validate.Struct(dst)
}

func WriteJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func WriteError(w http.ResponseWriter, status int, msg string) {
	WriteJSON(w, status, ErrorResponse{Error: msg})
}

func HandleDomainError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrInvalidCredential):
		WriteError(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, domain.ErrUnauthorized):
		WriteError(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, domain.ErrInactiveUser):
		WriteError(w, http.StatusForbidden, err.Error())
	case errors.Is(err, domain.ErrForbidden):
		WriteError(w, http.StatusForbidden, err.Error())
	case errors.Is(err, domain.ErrRateLimited):
		WriteError(w, http.StatusTooManyRequests, err.Error())
	case errors.Is(err, domain.ErrNotFound):
		WriteError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, domain.ErrConflict):
		WriteError(w, http.StatusConflict, err.Error())
	case errors.Is(err, domain.ErrValidation):
		WriteError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, domain.ErrInvalidTransition),
		errors.Is(err, domain.ErrInsufficientStock),
		errors.Is(err, domain.ErrSlotFull),
		errors.Is(err, domain.ErrCutoffPassed),
		errors.Is(err, domain.ErrBlackoutDate),
		errors.Is(err, domain.ErrNotServiceable),
		errors.Is(err, domain.ErrCancelNotAllowed),
		errors.Is(err, domain.ErrInvalidCoupon),
		errors.Is(err, domain.ErrInsufficientCoins):
		WriteError(w, http.StatusUnprocessableEntity, err.Error())
	default:
		WriteError(w, http.StatusInternalServerError, "internal server error")
	}
}

