#!/usr/bin/env bash
# Verify what puzzlebloom.taoliapp.com is actually serving.
#
# Run this after a manual `pnpm deploy`, and after any change to ci.yml. Every
# check below encodes something that reached production at least once, so a red
# line here is not hypothetical.
#
#   bash verify-deploy.sh                 # against production
#   bash verify-deploy.sh https://xxxx.pages.dev   # against a preview
#
# Exits 1 if anything fails.

set -uo pipefail

BASE="${1:-${PB_BASE_URL:-https://puzzlebloom.taoliapp.com}}"
STAMP=$(date +%s)
checks=0
fails=0

pass() { checks=$((checks + 1)); printf '  ok    %s\n' "$1"; }
fail() { checks=$((checks + 1)); fails=$((fails + 1)); printf '  FAIL  %s\n' "$1"; }
status() { curl -s -o /dev/null --max-time 20 -w '%{http_code}' "$1"; }
body() { curl -s --max-time 20 "$1"; }

echo "Verifying $BASE"

echo
echo "Routes"
for path in / /play/sudoku/ /themes/ /parents/; do
	code=$(status "$BASE$path")
	if [ "$code" = "200" ]; then
		pass "$path"
	else
		fail "$path returned $code, want 200"
	fi
done

# The site prerenders a real 404 page. Serving the SPA shell with 200 here is
# how you get a search engine indexing unlimited invented URLs.
code=$(status "$BASE/not-a-route-$STAMP")
if [ "$code" = "404" ]; then
	pass "unknown path returns 404"
else
	fail "unknown path returned $code, want 404"
fi

echo
echo "Internal links"
home=$(body "$BASE/?cb=$STAMP")
links=$(printf '%s' "$home" | grep -oE 'href="/[^"]*"' | sed 's/^href="//; s/"$//' | sort -u)
bare=""
for link in $links; do
	case "$link" in
	*/) continue ;; # already the canonical form
	esac
	# The trailing-slash rule is about routes. `/assets/index-abc.css` and
	# `/fonts/x.woff2` are files: adding a slash there would be the bug, not
	# the fix. A dot in the last segment is what separates the two.
	case "${link##*/}" in
	*.*) continue ;;
	esac
	bare="$bare $link"
done
if [ -z "$bare" ]; then
	pass "every internal route link carries a trailing slash"
else
	fail "routes a crawler will 308 on:$bare"
fi

echo
echo "Response headers"
headers=$(curl -sI --max-time 20 "$BASE/?cb=$STAMP")
check_header() {
	if printf '%s' "$headers" | grep -qi -- "$2"; then
		pass "$1"
	else
		fail "$1 (missing \"$2\")"
	fi
}
check_header "X-Content-Type-Options" "x-content-type-options: nosniff"
check_header "X-Frame-Options" "x-frame-options: DENY"
check_header "CSP frame-ancestors" "frame-ancestors 'none'"
# `interest-cohort` is the half of Permissions-Policy that drifted out of sync
# with vercel.json and nobody noticed. Checking it keeps it honest.
check_header "Permissions-Policy" "interest-cohort=()"
check_header "HSTS" "strict-transport-security:"

echo
echo "Asset caching"
asset=$(printf '%s' "$home" | grep -oE '/assets/[A-Za-z0-9._-]+\.js' | head -1)
if [ -n "$asset" ]; then
	cc=$(curl -sI --max-time 20 "$BASE$asset" | grep -i '^cache-control:' | tr -d '\r')
	case "$cc" in
	*immutable*) pass "hashed assets are immutable" ;;
	*) fail "asset cache-control was '${cc:-none}'" ;;
	esac
else
	fail "no hashed JS asset found on the home page"
fi

echo
echo "SEO surface"
robots=$(status "$BASE/robots.txt")
if [ "$robots" = "200" ]; then
	pass "robots.txt"
else
	fail "robots.txt returned $robots"
fi

sitemap=$(body "$BASE/sitemap.xml?cb=$STAMP")
count=$(printf '%s' "$sitemap" | grep -c '<loc>')
if [ "$count" -eq 4 ]; then
	pass "sitemap lists 4 URLs"
else
	fail "sitemap lists $count URLs, want 4 — did a route get added without prerendering?"
fi
if printf '%s' "$sitemap" | grep -qE '<loc>[^<]*[^/]</loc>'; then
	fail "sitemap has a URL without a trailing slash"
else
	pass "sitemap URLs match the canonical form"
fi

echo
echo "No local build leaked"
if printf '%s' "$home" | grep -q '127\.0\.0\.1\|localhost'; then
	fail "page references localhost — a dev build probably shipped"
else
	pass "no localhost references"
fi

echo
if [ "$fails" -eq 0 ]; then
	printf 'PASS — %s checks\n' "$checks"
	exit 0
fi
printf 'FAIL — %s of %s checks failed\n' "$fails" "$checks"
exit 1
