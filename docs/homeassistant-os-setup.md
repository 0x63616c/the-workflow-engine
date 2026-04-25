# Home Assistant OS Setup (Homelab)

Full HAOS install on Mac Mini (homelab) via QEMU. Not the Docker container version — full supervised OS with add-ons, backups, OS updates.

## Prerequisites

- macOS ARM64 (Apple Silicon Mac Mini)
- Homebrew installed
- SSH access to homelab via Tailscale

## Install QEMU + socket_vmnet

```bash
brew install qemu socket_vmnet
```

- QEMU with HVF (Hypervisor.framework) gives near-native performance on Apple Silicon. Pure CLI, no GUI app needed.
- socket_vmnet provides bridged networking so the VM gets a real LAN IP and can discover devices (Hue, Sonos, etc.)

## Configure socket_vmnet (Bridged Mode)

Default socket_vmnet uses shared/NAT mode (192.168.105.x subnet). For LAN device discovery, must use bridged mode on en1 (Wi-Fi).

Write the launchd plist to `/Library/LaunchDaemons/` (requires sudo):

```bash
sudo tee /Library/LaunchDaemons/homebrew.mxcl.socket_vmnet.plist << 'EOF'
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
EOF
```

Load and start the service via launchctl (not `brew services`, which is unreliable for this):

```bash
sudo launchctl bootstrap system /Library/LaunchDaemons/homebrew.mxcl.socket_vmnet.plist
```

Verify it's running in bridged mode:

```bash
ps aux | grep socket_vmnet
# Should show: --vmnet-mode=bridged --vmnet-interface=en1
```

To stop/restart, use `launchctl bootout` then `bootstrap` again:

```bash
sudo launchctl bootout system/homebrew.mxcl.socket_vmnet
sudo launchctl bootstrap system /Library/LaunchDaemons/homebrew.mxcl.socket_vmnet.plist
```

There is also a one-shot fix script at `scripts/fix-socket-vmnet.sh` that handles everything (stop VM, fix socket_vmnet, restart VM, verify HA). Copy to homelab and run with `sudo bash fix-socket-vmnet.sh`.

## Download HAOS Image

```bash
mkdir -p ~/homeassistant-os && cd ~/homeassistant-os

# Download aarch64 QCOW2 image (check https://github.com/home-assistant/operating-system/releases for latest)
curl -L -o haos.qcow2.xz https://github.com/home-assistant/operating-system/releases/download/17.2/haos_generic-aarch64-17.2.qcow2.xz

# Decompress
xz -d haos.qcow2.xz
```

## Resize Disk

```bash
qemu-img resize haos.qcow2 64G
```

Default image is ~449MB. 64GB gives room for add-ons, backups, data.

## Copy UEFI Firmware

```bash
cp /opt/homebrew/share/qemu/edk2-aarch64-code.fd efi_vars.fd
```

aarch64 VMs need UEFI to boot. Copy the firmware so the VM gets its own writable EFI variable store.

## Create Launch Script

The script must exit non-zero if `socket_vmnet` isn't ready yet. Wi-Fi association can lag behind launchd at boot, so the LaunchAgent's `KeepAlive` retries until the bridge is up.

```bash
cat > ~/homeassistant-os/start-haos.sh << 'SCRIPT'
#!/bin/bash
HAOS_DIR="$HOME/homeassistant-os"
PIDFILE="$HAOS_DIR/haos.pid"
SOCKET="/opt/homebrew/var/run/socket_vmnet"

# Already running?
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

/opt/homebrew/opt/socket_vmnet/bin/socket_vmnet_client \
    /opt/homebrew/var/run/socket_vmnet \
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
    -pidfile "$PIDFILE" \
    2>&1

if [ $? -eq 0 ]; then
    echo "HAOS started (PID $(cat "$PIDFILE"))"
else
    echo "Failed to start HAOS"
    exit 1
fi
SCRIPT
chmod +x ~/homeassistant-os/start-haos.sh
```

### QEMU Flags Explained

| Flag | Purpose |
|------|---------|
| `-accel hvf` | Apple hardware virtualization (fast) |
| `-cpu host` | Pass through real CPU features |
| `-smp 4 -m 4G` | 4 cores, 4GB RAM |
| `-drive ...efi_vars.fd` | UEFI firmware |
| `-drive ...haos.qcow2` | HAOS disk (virtio for speed) |
| `-netdev socket,id=net0,fd=3` | Bridged networking via socket_vmnet (fd=3 is the socket passed by socket_vmnet_client) |
| `-display none -daemonize` | Headless, background process |
| `-pidfile` | Track process for stop script |

### Networking Architecture

```
LAN (192.168.0.0/24)
  |
  en1 (Mac Mini Wi-Fi, 192.168.0.147)
  |
  socket_vmnet (bridged mode, runs as root via launchd)
  |
  socket_vmnet_client (no root needed, passes fd=3 to QEMU)
  |
  HAOS VM (gets 192.168.0.x via router DHCP)
```

HAOS sits directly on the LAN. Can discover and talk to Hue bridges, Sonos, etc. via mDNS.

## Create Stop Script

```bash
cat > ~/homeassistant-os/stop-haos.sh << 'SCRIPT'
#!/bin/bash
PIDFILE="$HOME/homeassistant-os/haos.pid"
if [ -f "$PIDFILE" ]; then
    kill "$(cat "$PIDFILE")" 2>/dev/null && echo "HAOS stopped" && rm -f "$PIDFILE"
else
    echo "No PID file found"
fi
SCRIPT
chmod +x ~/homeassistant-os/stop-haos.sh
```

## Auto-Start on Boot

`KeepAlive` with `SuccessfulExit=false` retries the script when it exits non-zero (Wi-Fi/socket not ready). `ThrottleInterval=30` caps retry rate at every 30s. Once HAOS is up the script exits 0 and launchd stops respawning.

```bash
cat > ~/Library/LaunchAgents/com.homeassistant.os.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.homeassistant.os</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>$HOME/homeassistant-os/start-haos.sh</string>
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
PLIST

launchctl load ~/Library/LaunchAgents/com.homeassistant.os.plist
```

Boot order: socket_vmnet starts first (system-level launchd), then HAOS starts (user-level LaunchAgent on login). Wi-Fi (en1) often isn't associated when launchd fires. The wait loops in `start-haos.sh` plus `KeepAlive` retries handle that.

## Auto-Start: OrbStack (Docker / Kamal accessories)

Kamal accessories (postgres, loki, grafana, alloy, evee) run in OrbStack. OrbStack is a GUI app and **does not start at boot** unless you add it to Login Items.

`scripts/harden-autostart.sh` handles the OrbStack login item and `pmset autorestart` for you (it sudoes when needed). Auto-login is the one bit you still flip by hand:

1. **Run** `bash scripts/harden-autostart.sh` on the Mini.
2. **Auto-login as `calum`**: System Settings → Users & Groups → Automatically log in as → `calum`. Required because Login Items only fire on login.

Containers in `config/deploy.yml` already have restart policies, so once Docker is up the Kamal stack returns on its own.

## Self-Healing Behavior

The hardened setup is designed to recover from a cold boot mid-network-outage without intervention:

| Failure | Recovery |
|---------|----------|
| en1 not associated yet | `start-haos.sh` waits 60s, exits 1, launchd retries every 30s indefinitely |
| `/opt/homebrew/var/run/socket_vmnet` missing | Same loop |
| `socket_vmnet` running but `vmnet_start_interface` wedged (`Connection refused` to client) | `start-haos.sh` runs `sudo launchctl kickstart -k system/homebrew.mxcl.socket_vmnet` to restart the daemon, then retries QEMU once. Allowed via `/etc/sudoers.d/evee-socket-vmnet` (passwordless for this one command only) |
| HAOS dies after starting | `KeepAlive { SuccessfulExit = false }` respawns on next non-zero exit |

A network outage of any length should self-heal as soon as Wi-Fi comes back: launchd keeps retrying, the script keeps waiting for en1, and once it's back the chain succeeds.

## Recovery Cheatsheet

After an unclean reboot, in order:

```bash
# 1. Verify socket_vmnet bound to en1 successfully
tail /opt/homebrew/var/log/socket_vmnet/stderr
# If you see VMNET_FAILURE, run scripts/fix-socket-vmnet.sh

# 2. Kick HAOS LaunchAgent (KeepAlive should already retry, this forces it)
launchctl kickstart -k "gui/$(id -u)/com.homeassistant.os"

# 3. Confirm HA responds
curl -s -o /dev/null -w '%{http_code}\n' http://homeassistant.local:8123/

# 4. Confirm Docker / Kamal stack
docker ps
```

## Files on Homelab

| File | Purpose |
|------|---------|
| `~/homeassistant-os/haos.qcow2` | VM disk (HAOS OS + data) |
| `~/homeassistant-os/efi_vars.fd` | UEFI firmware/vars |
| `~/homeassistant-os/start-haos.sh` | Start VM headless (via socket_vmnet_client) |
| `~/homeassistant-os/stop-haos.sh` | Graceful stop via PID |
| `~/homeassistant-os/haos.pid` | Running process ID |
| `~/Library/LaunchAgents/com.homeassistant.os.plist` | Auto-start HAOS on login |
| `/Library/LaunchDaemons/homebrew.mxcl.socket_vmnet.plist` | socket_vmnet bridged config (root service) |
| `/etc/sudoers.d/evee-socket-vmnet` | Passwordless `launchctl kickstart` of socket_vmnet for the self-heal path in `start-haos.sh` |

## Management

```bash
# Start
~/homeassistant-os/start-haos.sh

# Stop
~/homeassistant-os/stop-haos.sh

# Check if running
cat ~/homeassistant-os/haos.pid && ps aux | grep qemu

# Find HAOS LAN IP
ping -c1 homeassistant.local

# Access web UI
open http://homeassistant.local:8123
```

## Network Info

- **HAOS IP**: Assigned by router DHCP (currently 192.168.0.38)
- **LAN interface**: en1 (Wi-Fi)
- **Hue Bridge**: 192.168.0.23 (ecb5fa87de06.local, model BSB002)
- **Access**: http://homeassistant.local:8123 or http://192.168.0.38:8123

## Specs

- **HAOS version**: 17.2
- **Architecture**: generic-aarch64
- **VM resources**: 4 cores, 4GB RAM, 64GB disk
- **Networking**: Bridged via socket_vmnet on en1, real LAN IP

## Why QEMU Over UTM/VMware

- Headless, CLI-only, no GUI app needed
- `brew install` simple
- HVF acceleration = near-native speed
- UTM is just a GUI wrapper around QEMU anyway
- VMware Fusion works but heavier footprint for a headless server

## Why Bridged Networking (Not NAT)

- NAT mode (QEMU user networking or socket_vmnet shared) puts VM on isolated subnet (192.168.105.x)
- VM can reach internet but can't see LAN devices
- Hue bridges, Sonos speakers, etc. use mDNS discovery on the local subnet
- Bridged mode puts VM directly on LAN (192.168.0.x), same subnet as all devices
- Required for HA integrations that rely on local device discovery

## Updating HAOS

HAOS updates itself through the web UI (Settings > System > Updates). No need to manually download new images. The VM disk persists all data and config across updates.
