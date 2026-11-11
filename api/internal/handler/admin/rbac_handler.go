package admin

import (
	"math"
	"net/http"
	"strconv"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/giftlaya/giftlaya-api/internal/handler"
	"github.com/giftlaya/giftlaya-api/internal/middleware"
	"github.com/giftlaya/giftlaya-api/internal/service"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
)

type RBACHandler struct {
	rbacSvc  *service.RBACService
	auditSvc *service.AuditService
}

func NewRBACHandler(rbacSvc *service.RBACService, auditSvc *service.AuditService) *RBACHandler {
	return &RBACHandler{rbacSvc: rbacSvc, auditSvc: auditSvc}
}

type UsersListResponse struct {
	Items []domain.AdminProfile   `json:"items"`
	Meta  handler.PaginatedMeta   `json:"meta"`
}

type AuditListResponse struct {
	Items []domain.AuditEntry   `json:"items"`
	Meta  handler.PaginatedMeta `json:"meta"`
}

type UpdateRolePermissionsRequest struct {
	Permissions []service.RolePermissionInput `json:"permissions" validate:"required,dive"`
}

// SidebarCounts godoc
// @Summary Get live CMS sidebar badge counters
// @Tags Admin Dashboard
// @Produce json
// @Security BearerAuth
// @Success 200 {object} domain.SidebarCounts
// @Router /api/v1/admin/dashboard/sidebar-counts [get]
func (h *RBACHandler) SidebarCounts(w http.ResponseWriter, r *http.Request) {
	counts, err := h.rbacSvc.GetSidebarCounts(r.Context())
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, counts)
}

// ListRoles godoc
// @Summary List all RBAC roles and permission matrices
// @Tags Admin RBAC
// @Produce json
// @Security BearerAuth
// @Success 200 {array} service.RoleWithPermissions
// @Router /api/v1/admin/roles [get]
func (h *RBACHandler) ListRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := h.rbacSvc.ListRoles(r.Context())
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, roles)
}

// ListPermissions godoc
// @Summary List all RBAC permission modules
// @Tags Admin RBAC
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.Permission
// @Router /api/v1/admin/permissions [get]
func (h *RBACHandler) ListPermissions(w http.ResponseWriter, r *http.Request) {
	perms, err := h.rbacSvc.ListPermissions(r.Context())
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, perms)
}

// UpdateRolePermissions godoc
// @Summary Update permissions for an RBAC role
// @Tags Admin RBAC
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Role ID"
// @Param payload body UpdateRolePermissionsRequest true "Permissions"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/roles/{id}/permissions [put]
func (h *RBACHandler) UpdateRolePermissions(w http.ResponseWriter, r *http.Request) {
	roleID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid role id")
		return
	}
	var req UpdateRolePermissionsRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid permission payload")
		return
	}
	adm := middleware.AdminFromContext(r.Context())
	if err := h.rbacSvc.UpdateRolePermissions(r.Context(), adm, roleID, req.Permissions, chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "role permissions updated"})
}

// ListUsers godoc
// @Summary List admin users
// @Tags Admin Users
// @Produce json
// @Security BearerAuth
// @Param search query string false "Search username, email, full name"
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {object} UsersListResponse
// @Router /api/v1/admin/users [get]
func (h *RBACHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	items, total, err := h.rbacSvc.ListUsers(r.Context(), q.Get("search"), page, limit)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, UsersListResponse{
		Items: items,
		Meta: handler.PaginatedMeta{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: int(math.Ceil(float64(total) / float64(limit))),
		},
	})
}

// CreateUser godoc
// @Summary Create admin user
// @Tags Admin Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body service.CreateUserInput true "Admin user input"
// @Success 201 {object} domain.AdminProfile
// @Router /api/v1/admin/users [post]
func (h *RBACHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req service.CreateUserInput
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	adm := middleware.AdminFromContext(r.Context())
	created, err := h.rbacSvc.CreateUser(r.Context(), adm, req, chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, created)
}

// UpdateUser godoc
// @Summary Update admin user
// @Tags Admin Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Param payload body service.UpdateUserInput true "Admin user update"
// @Success 200 {object} domain.AdminProfile
// @Router /api/v1/admin/users/{id} [put]
func (h *RBACHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid user id")
		return
	}
	var req service.UpdateUserInput
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	adm := middleware.AdminFromContext(r.Context())
	updated, err := h.rbacSvc.UpdateUser(r.Context(), adm, id, req, chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, updated)
}

// DeleteUser godoc
// @Summary Soft-delete admin user
// @Tags Admin Users
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/users/{id} [delete]
func (h *RBACHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid user id")
		return
	}
	adm := middleware.AdminFromContext(r.Context())
	if adm.ID == id {
		handler.WriteError(w, http.StatusBadRequest, "cannot delete your own account")
		return
	}
	if err := h.rbacSvc.DeleteUser(r.Context(), adm, id, chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "user deleted"})
}

// ListAuditLogs godoc
// @Summary List immutable admin audit logs
// @Tags Admin Audit
// @Produce json
// @Security BearerAuth
// @Param module query string false "Module filter"
// @Param actor_id query int false "Actor ID filter"
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {object} AuditListResponse
// @Router /api/v1/admin/audit-logs [get]
func (h *RBACHandler) ListAuditLogs(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}
	var actorID *int64
	if rawActor := q.Get("actor_id"); rawActor != "" {
		if parsed, err := strconv.ParseInt(rawActor, 10, 64); err == nil {
			actorID = &parsed
		}
	}
	items, total, err := h.auditSvc.List(r.Context(), q.Get("module"), actorID, page, limit)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, AuditListResponse{
		Items: items,
		Meta: handler.PaginatedMeta{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: int(math.Ceil(float64(total) / float64(limit))),
		},
	})
}

