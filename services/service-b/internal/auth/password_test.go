package auth

import "testing"

func TestHashPassword(t *testing.T) {
	h, err := HashPassword("hello-world-9")
	if err != nil || h == "" {
		t.Fatal(err)
	}
	if !CheckPassword(h, "hello-world-9") {
		t.Fatal("should match")
	}
	if CheckPassword(h, "wrong") {
		t.Fatal("should not match")
	}
}
