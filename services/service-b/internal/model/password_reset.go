package model

import "time"

// PasswordResetToken stores short-lived password reset tokens (hashed).
type PasswordResetToken struct {
	ID        string `gorm:"type:uuid;primaryKey"`
	UserID    string `gorm:"type:uuid;not null;index"`
	TokenHash string `gorm:"not null;index"`
	ExpiresAt time.Time
	CreatedAt time.Time
}

// TableName returns the password_reset_tokens table name.
func (PasswordResetToken) TableName() string {
	return "password_reset_tokens"
}
