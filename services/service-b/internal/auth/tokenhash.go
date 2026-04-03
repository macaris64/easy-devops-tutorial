package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
)

// RandomToken returns a URL-safe random string and its SHA256 hex digest for storage.
func RandomToken() (plaintext string, hashHex string, err error) {
	raw := make([]byte, 32)
	if _, err = rand.Read(raw); err != nil {
		return "", "", err
	}
	plaintext = base64.RawURLEncoding.EncodeToString(raw)
	sum := sha256.Sum256([]byte(plaintext))
	hashHex = hex.EncodeToString(sum[:])
	return plaintext, hashHex, nil
}

// HashToken returns SHA256 hex of plaintext (for lookup).
func HashToken(plaintext string) string {
	sum := sha256.Sum256([]byte(plaintext))
	return hex.EncodeToString(sum[:])
}
