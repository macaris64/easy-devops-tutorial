package model

import "time"

// RefreshToken stores hashed refresh tokens for session revocation.
type RefreshToken struct {
	ID        string `gorm:"type:uuid;primaryKey"`
	UserID    string `gorm:"type:uuid;not null;index"`
	TokenHash string `gorm:"not null;uniqueIndex"`
	ExpiresAt time.Time
	CreatedAt time.Time
}

// TableName returns the refresh_tokens table name.
func (RefreshToken) TableName() string {
	return "refresh_tokens"
}
