#!/bin/bash
# Apply hardened autostart on homelab Mac Mini.
#
# Updates:
#   - ~/homeassistant-os/start-haos.sh (waits for en1 IP + socket_vmnet)
#   - ~/Library/LaunchAgents/com.homeassistant.os.plist (KeepAlive retries)
#   - OrbStack Login Item (so Docker/Kamal accessories start on login)
#   - pmset -a autorestart 1 (Mac auto-powers-on after a power cut)
#
# Run on homelab as the user that owns ~/homeassistant-os (calum):
#   bash scripts/harden-autostart.sh
#
# Will prompt for sudo password once (for pmset).
#
# Does NOT touch socket_vmnet plist (use scripts/fix-socket-vmnet.sh for that).
# Does NOT enable auto-login - that requires writing /etc/kcpassword and is
# safer to flip via System Settings -> Users & Groups.

set -euo pipefail

if [ "$EUID" -eq 0 ]; then
  echo "Run as your normal user, not root. The script will sudo when needed."
  exit 1
fi

HAOS_DIR="$HOME/homeassistant-os"
START_SCRIPT="$HAOS_DIR/start-haos.sh"
PLIST="$HOME/Library/LaunchAgents/com.homeassistant.os.plist"
LABEL="com.homeassistant.os"

if [ ! -d "$HAOS_DIR" ]; then
  echo "$HAOS_DIR not found - is this the homelab?"
  exit 1
fi

echo "[1/4] Writing $START_SCRIPT"
cat >"$START_SCRIPT" <<'SCRIPT'
#!/bin/bash
HAOS_DIR="$HOME/homeassistant-os"
PIDFILE="$HAOS_DIR/haos.pid"
SOCKET="/opt/homebrew/var/run/socket_vmnet"

if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "HAOS already running (PID $(cat "$PIDFILE"))"
    exit 0
fi

for _ in $(seq 1 30); do
    ipconfig getifaddr en1 >/dev/null 2>&1 && break
    sleep 2
done
if ! ipconfig getifaddr en1 >/dev/null 2>&1; then
    echo "en1 has no IP after 60s; exiting so launchd retries"
    exit 1
fi

for _ in $(seq 1 30); do
    [ -S "$SOCKET" ] && break
    sleep 2
done
if [ ! -S "$SOCKET" ]; then
    echo "socket_vmnet socket missing after 60s; exiting so launchd retries"
    exit 1
fi

/opt/homebrew/opt/socket_vmnet/bin/socket_vmnet_client \
    "$SOCKET" \
    qemu-system-aarch64 \
    -machine virt,highmem=on \
    -accel hvf \
    -cpu host \
    -smp 4 \
    -m 4G \
    -drive file="$HAOS_DIR/efi_vars.fd",format=raw,if=pflash \
    -drive file="$HAOS_DIR/haos.qcow2",format=qcow2,if=virtio \
    -device virtio-net-pci,netdev=net0 \
    -netdev socket,id=net0,fd=3 \
    -display none \
    -serial null \
    -daemonize \
    -pidfile "$PIDFILE" 2>&1

if [ $? -eq 0 ] && [ -f "$PIDFILE" ]; then
    echo "HAOS started (PID $(cat "$PIDFILE"))"
    exit 0
fi
echo "Failed to start HAOS"
exit 1
SCRIPT
chmod +x "$START_SCRIPT"

echo "[2/4] Writing $PLIST"
cat >"$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>\$HOME/homeassistant-os/start-haos.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>ThrottleInterval</key>
    <integer>30</integer>
    <key>StandardOutPath</key>
    <string>/tmp/haos-launch.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/haos-launch.log</string>
</dict>
</plist>
PLIST_EOF

echo "[3/6] Reloading LaunchAgent"
launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo "[4/6] Kickstarting HAOS"
launchctl kickstart -k "gui/$(id -u)/${LABEL}"

echo "[5/6] Adding OrbStack to Login Items"
if [ ! -d "/Applications/OrbStack.app" ]; then
  echo "  WARN: /Applications/OrbStack.app not found, skipping"
elif [ -z "${SSH_TTY:-}${SSH_CONNECTION:-}" ] || [ -n "${TERM_PROGRAM:-}" ]; then
  if osascript >/dev/null 2>&1 <<'OSA'; then
tell application "System Events"
  if not (exists login item "OrbStack") then
    make login item at end with properties {path:"/Applications/OrbStack.app", hidden:false}
  end if
end tell
OSA
    echo "  OrbStack login item present"
  else
    echo "  WARN: osascript failed; add OrbStack via System Settings > Login Items"
  fi
else
  echo "  SKIP: System Events needs a GUI session. Run this script locally on the Mini, or add OrbStack via System Settings > Login Items."
fi

echo "[6/6] Enabling auto-power-on after power loss (sudo)"
sudo pmset -a autorestart 1

echo
echo "Done. Tail /tmp/haos-launch.log to watch retries."
echo "Manual step still needed: System Settings > Users & Groups > auto-login as $USER."
