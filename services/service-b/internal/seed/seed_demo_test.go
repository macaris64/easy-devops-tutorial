package seed

import (
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"easy-devops-tutorial/service-b/internal/model"
)

func TestEnsureDemoUser_noEnv(t *testing.T) {
	t.Setenv("SEED_DEMO_USERNAME", "")
	t.Setenv("SEED_DEMO_PASSWORD", "")
	db, err := gorm.Open(sqlite.Open("file:demo_none?mode=memory"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.Role{}); err != nil {
		t.Fatal(err)
	}
	if err := EnsureRoles(db); err != nil {
		t.Fatal(err)
	}
	if err := EnsureDemoUser(db); err != nil {
		t.Fatal(err)
	}
}

func TestEnsureDemoUser_createsAndSkipsExisting(t *testing.T) {
	t.Setenv("SEED_DEMO_USERNAME", "demouser")
	t.Setenv("SEED_DEMO_PASSWORD", "demopass789")
	t.Setenv("SEED_DEMO_EMAIL", "demo@example.com")

	db, err := gorm.Open(sqlite.Open("file:demo_create?mode=memory"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.Role{}); err != nil {
		t.Fatal(err)
	}
	if err := EnsureRoles(db); err != nil {
		t.Fatal(err)
	}
	if err := EnsureDemoUser(db); err != nil {
		t.Fatal(err)
	}
	var u model.User
	if err := db.Preload("Roles").Where("username = ?", "demouser").First(&u).Error; err != nil {
		t.Fatal(err)
	}
	if u.Email != "demo@example.com" {
		t.Fatalf("email=%q", u.Email)
	}
	if len(u.Roles) != 1 || u.Roles[0].Name != model.RoleUser {
		t.Fatalf("roles=%v", u.Roles)
	}

	if err := EnsureDemoUser(db); err != nil {
		t.Fatal(err)
	}
}

func TestEnsureDemoUser_defaultEmail(t *testing.T) {
	t.Setenv("SEED_DEMO_USERNAME", "alice")
	t.Setenv("SEED_DEMO_PASSWORD", "alicepass999")
	t.Setenv("SEED_DEMO_EMAIL", "")

	db, err := gorm.Open(sqlite.Open("file:demo_email?mode=memory"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.Role{}); err != nil {
		t.Fatal(err)
	}
	if err := EnsureRoles(db); err != nil {
		t.Fatal(err)
	}
	if err := EnsureDemoUser(db); err != nil {
		t.Fatal(err)
	}
	var u model.User
	if err := db.Where("username = ?", "alice").First(&u).Error; err != nil {
		t.Fatal(err)
	}
	if u.Email != "alice@localhost" {
		t.Fatalf("email=%q", u.Email)
	}
}
