package grpcserver

import (
	"fmt"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"easy-devops-tutorial/service-b/internal/model"
	"easy-devops-tutorial/service-b/internal/seed"
)

// openTestDB returns an in-memory SQLite DB migrated for grpcserver tests.
// nameExtra is appended to t.Name() for the DSN file key (e.g. "_auth" for a second DB style).
func openTestDB(t *testing.T, nameExtra string) *gorm.DB {
	t.Helper()
	dsn := fmt.Sprintf("file:%s%s?mode=memory&cache=shared", t.Name(), nameExtra)
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.Role{}, &model.RefreshToken{}, &model.PasswordResetToken{}); err != nil {
		t.Fatal(err)
	}
	if err := seed.EnsureRoles(db); err != nil {
		t.Fatal(err)
	}
	return db
}
