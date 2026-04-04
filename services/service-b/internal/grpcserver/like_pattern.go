package grpcserver

import "strings"

// likeSubstringPattern returns a case-insensitive LIKE pattern "%fragment%" (fragment lowercased)
// or ("", false) if there is no usable fragment after trimming and stripping wildcards.
func likeSubstringPattern(raw string) (pat string, ok bool) {
	s := strings.TrimSpace(raw)
	if s == "" {
		return "", false
	}
	var b strings.Builder
	for _, r := range s {
		if r == '%' || r == '_' || r == '\\' {
			continue
		}
		b.WriteRune(r)
	}
	inner := strings.TrimSpace(b.String())
	if inner == "" {
		return "", false
	}
	return "%" + strings.ToLower(inner) + "%", true
}
