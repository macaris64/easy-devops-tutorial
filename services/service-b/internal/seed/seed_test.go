package seed

import (
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"easy-devops-tutorial/service-b/internal/model"
)

func TestEnsureRoles_idempotent(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:seed_roles?mode=memory"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&model.Role{}); err != nil {
		t.Fatal(err)
	}
	if err := EnsureRoles(db); err != nil {
		t.Fatal(err)
	}
	if err := EnsureRoles(db); err != nil {
		t.Fatal(err)
	}
	var n int64
	if err := db.Model(&model.Role{}).Count(&n).Error; err != nil || n < 2 {
		t.Fatalf("roles=%d err=%v", n, err)
	}
}
