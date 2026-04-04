package seed

import (
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"easy-devops-tutorial/service-b/internal/model"
)

func TestBootstrapAdmin_noEnv(t *testing.T) {
	t.Setenv("BOOTSTRAP_ADMIN_USERNAME", "")
	t.Setenv("BOOTSTRAP_ADMIN_PASSWORD", "")
	db, err := gorm.Open(sqlite.Open("file:bootstrap_none?mode=memory"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.Role{}); err != nil {
		t.Fatal(err)
	}
	if err := EnsureRoles(db); err != nil {
		t.Fatal(err)
	}
	if err := BootstrapAdmin(db); err != nil {
		t.Fatal(err)
	}
}

func TestBootstrapAdmin_createsAndSkipsExisting(t *testing.T) {
	t.Setenv("BOOTSTRAP_ADMIN_USERNAME", "seedadmin")
	t.Setenv("BOOTSTRAP_ADMIN_PASSWORD", "longpassword123")
	t.Setenv("BOOTSTRAP_ADMIN_EMAIL", "seed@example.com")

	db, err := gorm.Open(sqlite.Open("file:bootstrap_create?mode=memory"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.Role{}); err != nil {
		t.Fatal(err)
	}
	if err := EnsureRoles(db); err != nil {
		t.Fatal(err)
	}
	if err := BootstrapAdmin(db); err != nil {
		t.Fatal(err)
	}
	var u model.User
	if err := db.Preload("Roles").Where("username = ?", "seedadmin").First(&u).Error; err != nil {
		t.Fatal(err)
	}
	if u.Email != "seed@example.com" {
		t.Fatalf("email=%q", u.Email)
	}
	var adminOK, userOK bool
	for _, r := range u.Roles {
		switch r.Name {
		case model.RoleAdmin:
			adminOK = true
		case model.RoleUser:
			userOK = true
		}
	}
	if !adminOK || !userOK {
		t.Fatalf("roles=%v", u.Roles)
	}

	if err := BootstrapAdmin(db); err != nil {
		t.Fatal(err)
	}
}

func TestBootstrapAdmin_defaultEmail(t *testing.T) {
	t.Setenv("BOOTSTRAP_ADMIN_USERNAME", "adm2")
	t.Setenv("BOOTSTRAP_ADMIN_PASSWORD", "longpassword456")
	t.Setenv("BOOTSTRAP_ADMIN_EMAIL", "")

	db, err := gorm.Open(sqlite.Open("file:bootstrap_email?mode=memory"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.Role{}); err != nil {
		t.Fatal(err)
	}
	if err := EnsureRoles(db); err != nil {
		t.Fatal(err)
	}
	if err := BootstrapAdmin(db); err != nil {
		t.Fatal(err)
	}
	var u model.User
	if err := db.Where("username = ?", "adm2").First(&u).Error; err != nil {
		t.Fatal(err)
	}
	if u.Email != "adm2@localhost" {
		t.Fatalf("email=%q", u.Email)
	}
}
