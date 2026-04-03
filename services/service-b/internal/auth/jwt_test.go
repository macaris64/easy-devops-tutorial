package auth

import (
	"testing"
	"time"
)

func TestJWTSigner_IssueAndParse(t *testing.T) {
	s := NewJWTSigner("secret", "iss", "aud")
	tok, secs, err := s.IssueAccessToken("u1", []string{"admin", "user"}, time.Minute)
	if err != nil || tok == "" || secs < 50 {
		t.Fatalf("issue: %v %q %d", err, tok, secs)
	}
	uid, roles, err := s.ParseToken(tok)
	if err != nil || uid != "u1" || len(roles) != 2 {
		t.Fatalf("parse: %v %q %v", err, uid, roles)
	}
}

func TestJWTSigner_ParseAuthorizationBearer(t *testing.T) {
	s := NewJWTSigner("x", "", "")
	tok, _, _ := s.IssueAccessToken("a", nil, time.Hour)
	uid, _, err := s.ParseAuthorizationBearer("Bearer " + tok)
	if err != nil || uid != "a" {
		t.Fatal(err)
	}
	if _, _, err := s.ParseAuthorizationBearer(""); err == nil {
		t.Fatal("expected err")
	}
	if _, _, err := s.ParseAuthorizationBearer("Basic x"); err == nil {
		t.Fatal("expected err")
	}
}

func TestJWTSigner_emptySecret(t *testing.T) {
	s := NewJWTSigner("", "", "")
	if _, _, err := s.IssueAccessToken("a", nil, time.Minute); err == nil {
		t.Fatal("expected err")
	}
}

func TestJWTSigner_badToken(t *testing.T) {
	s := NewJWTSigner("s", "", "")
	if _, _, err := s.ParseToken("not-a-jwt"); err == nil {
		t.Fatal("expected err")
	}
	wrong := NewJWTSigner("other", "", "")
	tok, _, _ := s.IssueAccessToken("a", nil, time.Minute)
	if _, _, err := wrong.ParseToken(tok); err == nil {
		t.Fatal("expected err")
	}
}

func TestRandomToken(t *testing.T) {
	a, ha, err := RandomToken()
	if err != nil || len(a) < 10 || ha == "" {
		t.Fatal(err)
	}
	b, hb, _ := RandomToken()
	if a == b || ha == hb {
		t.Fatal("expected unique")
	}
	if HashToken(a) != ha {
		t.Fatal("hash mismatch")
	}
}
