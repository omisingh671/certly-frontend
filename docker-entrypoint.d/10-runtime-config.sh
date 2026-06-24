#!/bin/sh
set -eu

escape_js() {
  printf '%s' "$1" | sed "s/\\\\/\\\\\\\\/g; s/'/\\\\'/g"
}

API_URL="${VITE_API_URL:-/api}"
SHOW_DEMO_CREDENTIALS="${VITE_SHOW_DEMO_CREDENTIALS:-false}"

cat > /usr/share/nginx/html/env.js <<EOF
window.__APP_CONFIG__ = {
  VITE_API_URL: '$(escape_js "$API_URL")',
  VITE_SHOW_DEMO_CREDENTIALS: '$(escape_js "$SHOW_DEMO_CREDENTIALS")'
};
EOF
