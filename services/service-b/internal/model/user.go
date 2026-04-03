package model

import (
	"time"

	"gorm.io/gorm"
)

// User is the GORM model for persisted users.
type User struct {
	ID        string         `gorm:"type:uuid;primaryKey"`
	Username  string         `gorm:"uniqueIndex;not null"`
	Email     string         `gorm:"uniqueIndex;not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

// TableName returns the users table name.
func (User) TableName() string {
	return "users"
}
