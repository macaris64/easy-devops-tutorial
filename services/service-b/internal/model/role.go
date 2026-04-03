package model

import (
	"time"

	"gorm.io/gorm"
)

// Role is a named RBAC role.
type Role struct {
	ID        string `gorm:"type:uuid;primaryKey"`
	Name      string `gorm:"uniqueIndex;not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

// TableName returns the roles table name.
func (Role) TableName() string {
	return "roles"
}

// Well-known role names.
const (
	RoleAdmin = "admin"
	RoleUser  = "user"
)
