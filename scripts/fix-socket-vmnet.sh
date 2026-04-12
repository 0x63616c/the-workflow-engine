#!/bin/bash
# Fix socket_vmnet: switch from NAT mode to bridged mode on en1 (Wi-Fi)
# Must run with sudo: sudo bash fix-socket-vmnet.sh

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Must run as root: sudo bash $0"
  exit 1
fi

PLIST="/Library/LaunchDaemons/homebrew.mxcl.socket_vmnet.plist"

echo "Stopping socket_vmnet..."
brew services stop socket_vmnet 2>/dev/null || true

echo "Writing bridged mode plist to $PLIST..."
cat > "$PLIST" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>homebrew.mxcl.socket_vmnet</string>
    <key>LimitLoadToSessionType</key>
    <array>
        <string>Aqua</string>
        <string>Background</string>
        <string>LoginWindow</string>
        <string>StandardIO</string>
        <string>System</string>
    </array>
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
PLIST

echo "Starting socket_vmnet..."
brew services start socket_vmnet

echo "Waiting 3s for socket to be ready..."
sleep 3

echo "Verifying bridged mode..."
if grep -q "mode 1002" /opt/homebrew/var/log/socket_vmnet/stderr 2>/dev/null; then
  echo "OK: socket_vmnet running in bridged mode (1002)"
elif grep -q "vmnet_start_address: 192.168.0" /opt/homebrew/var/log/socket_vmnet/stderr 2>/dev/null; then
  echo "OK: socket_vmnet on LAN subnet"
else
  echo "Checking logs..."
  tail -5 /opt/homebrew/var/log/socket_vmnet/stderr
fi

echo ""
echo "Now restart HAOS VM to pick up networking:"
echo "  ~/homeassistant-os/stop-haos.sh && sleep 2 && ~/homeassistant-os/start-haos.sh"
echo ""
echo "Then wait ~60s and check: ping 192.168.0.38"
