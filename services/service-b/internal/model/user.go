package model

import (
	"time"

	"gorm.io/gorm"
)

// User is the GORM model for persisted users.
type User struct {
	ID           string `gorm:"type:uuid;primaryKey"`
	Username     string `gorm:"uniqueIndex;not null"`
	Email        string `gorm:"uniqueIndex;not null"`
	PasswordHash string `gorm:"column:password_hash;not null;default:''"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"`
	Roles        []Role         `gorm:"many2many:user_roles;"`
}

// TableName returns the users table name.
func (User) TableName() string {
	return "users"
}
