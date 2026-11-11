package admin

import (
	"net/http"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/giftlaya/giftlaya-api/internal/handler"
	"github.com/giftlaya/giftlaya-api/internal/middleware"
	"github.com/giftlaya/giftlaya-api/internal/service"
	chimw "github.com/go-chi/chi/v5/middleware"
)

type AuthHandler struct {
	authSvc *service.AuthService
}

func NewAuthHandler(authSvc *service.AuthService) *AuthHandler {
	return &AuthHandler{authSvc: authSvc}
}

type LoginRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
	Code     string `json:"code" validate:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

type EnableTOTPRequest struct {
	Code string `json:"code" validate:"required,len=6"`
}

// Login godoc
// @Summary Admin CMS login
// @Description Authenticates admin user using username, password, and access code or TOTP 2FA (matching live Giftlaya CMS v2)
// @Tags Admin Auth
// @Accept json
// @Produce json
// @Param payload body LoginRequest true "Admin login credentials"
// @Success 200 {object} service.LoginResponse
// @Failure 400 {object} handler.ErrorResponse
// @Failure 401 {object} handler.ErrorResponse
// @Failure 429 {object} handler.ErrorResponse
// @Router /api/v1/admin/auth/login [post]
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, "username, password, and access code are required")
		return
	}
	res, err := h.authSvc.Login(
		r.Context(),
		req.Username,
		req.Password,
		req.Code,
		middleware.ClientIP(r),
		r.UserAgent(),
		chimw.GetReqID(r.Context()),
	)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, res)
}

// Refresh godoc
// @Summary Rotate refresh token
// @Tags Admin Auth
// @Accept json
// @Produce json
// @Param payload body RefreshRequest true "Refresh token"
// @Success 200 {object} service.LoginResponse
// @Failure 401 {object} handler.ErrorResponse
// @Router /api/v1/admin/auth/refresh [post]
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, "refresh_token is required")
		return
	}
	res, err := h.authSvc.Refresh(r.Context(), req.RefreshToken, middleware.ClientIP(r), r.UserAgent())
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, res)
}

// Logout godoc
// @Summary Logout and revoke refresh token
// @Tags Admin Auth
// @Accept json
// @Produce json
// @Param payload body LogoutRequest false "Refresh token to revoke"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/auth/logout [post]
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req LogoutRequest
	_ = handler.DecodeAndValidate(r, &req)
	var uid *int64
	uname := ""
	if adm := middleware.AdminFromContext(r.Context()); adm != nil {
		uid = &adm.ID
		uname = adm.Username
	}
	_ = h.authSvc.Logout(r.Context(), req.RefreshToken, uid, uname, chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "logged out"})
}

// Me godoc
// @Summary Get current authenticated admin profile and permissions
// @Tags Admin Auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} domain.AdminProfile
// @Failure 401 {object} handler.ErrorResponse
// @Router /api/v1/admin/auth/me [get]
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	adm := middleware.AdminFromContext(r.Context())
	if adm == nil {
		handler.WriteError(w, http.StatusUnauthorized, domain.ErrUnauthorized.Error())
		return
	}
	handler.WriteJSON(w, http.StatusOK, adm)
}

// ChangePassword godoc
// @Summary Change current admin password
// @Tags Admin Auth
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body ChangePasswordRequest true "Passwords"
// @Success 200 {object} handler.MessageResponse
// @Failure 400 {object} handler.ErrorResponse
// @Failure 401 {object} handler.ErrorResponse
// @Router /api/v1/admin/auth/change-password [post]
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	adm := middleware.AdminFromContext(r.Context())
	var req ChangePasswordRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, "valid current_password and new_password (min 8 chars) required")
		return
	}
	if err := h.authSvc.ChangePassword(r.Context(), adm.ID, req.CurrentPassword, req.NewPassword, chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "password updated"})
}

// ForgotPassword godoc
// @Summary Request admin password reset email
// @Tags Admin Auth
// @Accept json
// @Produce json
// @Param payload body ForgotPasswordRequest true "Email"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/auth/forgot-password [post]
func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req ForgotPasswordRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, "valid email is required")
		return
	}
	_ = h.authSvc.ForgotPassword(r.Context(), req.Email)
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "if an account exists, a reset link has been sent"})
}

// ResetPassword godoc
// @Summary Reset admin password with token
// @Tags Admin Auth
// @Accept json
// @Produce json
// @Param payload body ResetPasswordRequest true "Reset token & new password"
// @Success 200 {object} handler.MessageResponse
// @Failure 401 {object} handler.ErrorResponse
// @Router /api/v1/admin/auth/reset-password [post]
func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req ResetPasswordRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, "token and new_password (min 8 chars) required")
		return
	}
	if err := h.authSvc.ResetPassword(r.Context(), req.Token, req.NewPassword); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "password reset successful"})
}

// SetupTOTP godoc
// @Summary Generate TOTP 2FA secret for current admin
// @Tags Admin Auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} service.TOTPSetupResponse
// @Router /api/v1/admin/auth/totp/setup [post]
func (h *AuthHandler) SetupTOTP(w http.ResponseWriter, r *http.Request) {
	adm := middleware.AdminFromContext(r.Context())
	res, err := h.authSvc.SetupTOTP(r.Context(), adm.ID)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, res)
}

// EnableTOTP godoc
// @Summary Verify and enable TOTP 2FA for current admin
// @Tags Admin Auth
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body EnableTOTPRequest true "6-digit TOTP code"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/auth/totp/enable [post]
func (h *AuthHandler) EnableTOTP(w http.ResponseWriter, r *http.Request) {
	adm := middleware.AdminFromContext(r.Context())
	var req EnableTOTPRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, "6-digit TOTP code is required")
		return
	}
	if err := h.authSvc.EnableTOTP(r.Context(), adm.ID, req.Code, chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "totp 2fa enabled"})
}

