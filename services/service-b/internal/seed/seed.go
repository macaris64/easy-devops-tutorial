package seed

import (
	"errors"
	"log"
	"os"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"easy-devops-tutorial/service-b/internal/auth"
	"easy-devops-tutorial/service-b/internal/model"
)

// EnsureRoles creates default roles if missing.
func EnsureRoles(db *gorm.DB) error {
	for _, name := range []string{model.RoleUser, model.RoleAdmin} {
		var n int64
		if err := db.Model(&model.Role{}).Where("name = ?", name).Count(&n).Error; err != nil {
			return err
		}
		if n > 0 {
			continue
		}
		r := model.Role{ID: uuid.NewString(), Name: name}
		if err := db.Create(&r).Error; err != nil {
			return err
		}
		log.Printf("seed: created role %q", name)
	}
	return nil
}

// BootstrapAdmin creates an admin user from env when credentials are set.
func BootstrapAdmin(db *gorm.DB) error {
	u := os.Getenv("BOOTSTRAP_ADMIN_USERNAME")
	p := os.Getenv("BOOTSTRAP_ADMIN_PASSWORD")
	if u == "" || p == "" {
		return nil
	}
	var existing model.User
	err := db.Where("username = ?", u).First(&existing).Error
	if err == nil {
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	hash, err := auth.HashPassword(p)
	if err != nil {
		return err
	}
	email := os.Getenv("BOOTSTRAP_ADMIN_EMAIL")
	if email == "" {
		email = u + "@localhost"
	}
	user := model.User{
		ID:           uuid.NewString(),
		Username:     u,
		Email:        email,
		PasswordHash: hash,
	}
	var adminRole, userRole model.Role
	if err := db.Where("name = ?", model.RoleAdmin).First(&adminRole).Error; err != nil {
		return err
	}
	if err := db.Where("name = ?", model.RoleUser).First(&userRole).Error; err != nil {
		return err
	}
	user.Roles = []model.Role{userRole, adminRole}
	if err := db.Create(&user).Error; err != nil {
		return err
	}
	log.Printf("seed: bootstrap admin user %q created", u)
	return nil
}
