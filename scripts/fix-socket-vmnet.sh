#!/bin/bash
# Fix socket_vmnet + restart HAOS with bridged networking
# Run on homelab (Mac Mini): sudo bash fix-socket-vmnet.sh

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Must run as root: sudo bash $0"
  exit 1
fi

PLIST="/Library/LaunchDaemons/homebrew.mxcl.socket_vmnet.plist"
HAOS_DIR="/Users/${SUDO_USER:-calum}/homeassistant-os"

echo "[1/6] Stopping HAOS VM..."
su "${SUDO_USER:-calum}" -c "$HAOS_DIR/stop-haos.sh" 2>/dev/null || echo "  VM was not running"

echo "[2/6] Unloading socket_vmnet..."
launchctl bootout system/homebrew.mxcl.socket_vmnet 2>/dev/null || true
sleep 1

echo "[3/6] Writing bridged mode plist..."
cat > "$PLIST" << 'PLIST_EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>homebrew.mxcl.socket_vmnet</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/opt/socket_vmnet/bin/socket_vmnet</string>
        <string>--vmnet-mode=bridged</string>
        <string>--vmnet-interface=en1</string>
        <string>/opt/homebrew/var/run/socket_vmnet</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>/opt/homebrew/var/log/socket_vmnet/stderr</string>
    <key>StandardOutPath</key>
    <string>/opt/homebrew/var/log/socket_vmnet/stdout</string>
</dict>
</plist>
PLIST_EOF

echo "[4/6] Loading socket_vmnet into launchd..."
launchctl bootstrap system "$PLIST"
sleep 3

if ps aux | grep -v grep | grep -q "vmnet-mode=bridged"; then
  echo "  OK: socket_vmnet running in bridged mode"
else
  echo "  WARN: check logs:"
  tail -5 /opt/homebrew/var/log/socket_vmnet/stderr
fi

echo "[5/6] Starting HAOS VM..."
su "${SUDO_USER:-calum}" -c "$HAOS_DIR/start-haos.sh"

echo "[6/6] Waiting for HA to boot (up to 60s)..."
for i in $(seq 1 12); do
  sleep 5
  printf "  %ds..." $((i * 5))
  HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 http://192.168.0.38:8123/api/ 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" != "000" ]; then
    echo ""
    echo ""
    echo "=== SUCCESS ==="
    echo "HA responding at 192.168.0.38:8123 (HTTP $HTTP_CODE)"
    echo "socket_vmnet: bridged on en1"
    exit 0
  fi
done

echo ""
echo ""
echo "=== HA not responding after 60s ==="
echo "  socket_vmnet: $(ps aux | grep -v grep | grep socket_vmnet | awk '{print $NF}')"
echo "  ARP: $(arp -a | grep 192.168.0.38 || echo 'not found')"
echo "  VM PID: $(cat $HAOS_DIR/haos.pid 2>/dev/null || echo 'not found')"
echo "Try: curl http://192.168.0.38:8123/api/"
