package grpcserver

import "testing"

func Test_likeSubstringPattern(t *testing.T) {
	t.Parallel()
	if _, ok := likeSubstringPattern(""); ok {
		t.Fatal("empty")
	}
	if _, ok := likeSubstringPattern("   "); ok {
		t.Fatal("spaces only")
	}
	if _, ok := likeSubstringPattern("%_\\"); ok {
		t.Fatal("wildcards only")
	}
	p, ok := likeSubstringPattern("  Foo%bar  ")
	if !ok || p != "%foobar%" {
		t.Fatalf("got %q %v", p, ok)
	}
}
