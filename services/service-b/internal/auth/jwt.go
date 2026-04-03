package auth

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TokenPair holds issued tokens and expiry for access token.
type TokenPair struct {
	AccessToken      string
	RefreshToken     string
	ExpiresInSeconds int64
}

// JWTSigner issues and parses access tokens.
type JWTSigner struct {
	secret []byte
	issuer string
	aud    string
}

// NewJWTSigner builds a signer from secret bytes.
func NewJWTSigner(secret, issuer, audience string) *JWTSigner {
	return &JWTSigner{secret: []byte(secret), issuer: issuer, aud: audience}
}

// IssueAccessToken creates a signed JWT for userID and roles.
func (s *JWTSigner) IssueAccessToken(userID string, roles []string, ttl time.Duration) (string, int64, error) {
	if len(s.secret) == 0 {
		return "", 0, errors.New("jwt secret is empty")
	}
	now := time.Now()
	secs := int64(ttl.Seconds())
	claims := jwt.MapClaims{
		"sub":   userID,
		"roles": roles,
		"iat":   now.Unix(),
		"exp":   now.Add(ttl).Unix(),
	}
	if s.issuer != "" {
		claims["iss"] = s.issuer
	}
	if s.aud != "" {
		claims["aud"] = s.aud
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString(s.secret)
	if err != nil {
		return "", 0, err
	}
	return signed, secs, nil
}

// ParseAuthorizationBearer extracts and validates JWT from "Bearer <token>".
func (s *JWTSigner) ParseAuthorizationBearer(authHeader string) (userID string, roles []string, err error) {
	if authHeader == "" {
		return "", nil, errors.New("missing authorization")
	}
	parts := strings.SplitN(strings.TrimSpace(authHeader), " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", nil, errors.New("invalid authorization scheme")
	}
	return s.ParseToken(parts[1])
}

// ParseToken validates a raw JWT string.
func (s *JWTSigner) ParseToken(tokenStr string) (userID string, roles []string, err error) {
	tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.secret, nil
	})
	if err != nil || !tok.Valid {
		return "", nil, errors.New("invalid token")
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return "", nil, errors.New("invalid claims")
	}
	sub, _ := claims["sub"].(string)
	if sub == "" {
		return "", nil, errors.New("missing sub")
	}
	var rs []string
	if raw, ok := claims["roles"].([]interface{}); ok {
		for _, r := range raw {
			if s, ok := r.(string); ok {
				rs = append(rs, s)
			}
		}
	}
	return sub, rs, nil
}
