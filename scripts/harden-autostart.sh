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

echo "[1/7] Writing $START_SCRIPT"
cat >"$START_SCRIPT" <<'SCRIPT'
#!/bin/bash
HAOS_DIR="$HOME/homeassistant-os"
PIDFILE="$HAOS_DIR/haos.pid"
SOCKET="/opt/homebrew/var/run/socket_vmnet"
VMNET_LABEL="system/homebrew.mxcl.socket_vmnet"

if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "HAOS already running (PID $(cat "$PIDFILE"))"
  exit 0
fi

# Wait for Wi-Fi (en1) to have an IP. socket_vmnet can't bridge until then.
for _ in $(seq 1 30); do
  ipconfig getifaddr en1 >/dev/null 2>&1 && break
  sleep 2
done
if ! ipconfig getifaddr en1 >/dev/null 2>&1; then
  echo "en1 has no IP after 60s; exiting so launchd retries"
  exit 1
fi

# Wait for socket_vmnet daemon socket
for _ in $(seq 1 30); do
  [ -S "$SOCKET" ] && break
  sleep 2
done
if [ ! -S "$SOCKET" ]; then
  echo "socket_vmnet socket missing after 60s; exiting so launchd retries"
  exit 1
fi

run_qemu() {
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
}

OUT=$(run_qemu)
EC=$?

# Self-heal: if socket_vmnet is wedged (vmnet_start_interface failure surfaces
# as "Connection refused" to the client), kick the daemon and retry once.
if [ $EC -ne 0 ] && echo "$OUT" | grep -qi "Connection refused"; then
  echo "socket_vmnet wedged, kicking via sudo..."
  if sudo -n /bin/launchctl kickstart -k "$VMNET_LABEL" 2>/dev/null; then
    for _ in $(seq 1 15); do
      [ -S "$SOCKET" ] && break
      sleep 2
    done
    sleep 2
    OUT=$(run_qemu)
    EC=$?
  else
    echo "passwordless sudo for socket_vmnet kickstart not configured"
  fi
fi

if [ $EC -eq 0 ] && [ -f "$PIDFILE" ]; then
  echo "HAOS started (PID $(cat "$PIDFILE"))"
  exit 0
fi
echo "$OUT"
echo "Failed to start HAOS"
exit 1
SCRIPT
chmod +x "$START_SCRIPT"

echo "[2/7] Installing sudoers rule for socket_vmnet kickstart"
SUDOERS_FILE=/etc/sudoers.d/evee-socket-vmnet
SUDOERS_TMP=$(mktemp)
cat >"$SUDOERS_TMP" <<EOF
# Allow $USER to kick socket_vmnet when it gets wedged after en1 flapping.
# Used by ~/homeassistant-os/start-haos.sh self-heal path.
Cmnd_Alias EVEE_VMNET_KICK = /bin/launchctl kickstart -k system/homebrew.mxcl.socket_vmnet
$USER ALL=(root) NOPASSWD: EVEE_VMNET_KICK
EOF
if sudo visudo -cf "$SUDOERS_TMP" >/dev/null; then
  sudo install -m 0440 -o root -g wheel "$SUDOERS_TMP" "$SUDOERS_FILE"
  echo "  installed $SUDOERS_FILE"
else
  echo "  ERROR: visudo rejected the rule, leaving sudoers untouched"
fi
rm -f "$SUDOERS_TMP"

echo "[3/7] Writing $PLIST"
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

echo "[4/7] Reloading LaunchAgent"
launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo "[5/7] Kickstarting HAOS"
launchctl kickstart -k "gui/$(id -u)/${LABEL}"

echo "[6/7] Adding OrbStack to Login Items"
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

echo "[7/7] Enabling auto-power-on after power loss"
sudo pmset -a autorestart 1

echo
echo "Done. Tail /tmp/haos-launch.log to watch retries."
echo "Manual step still needed: System Settings > Users & Groups > auto-login as $USER."
