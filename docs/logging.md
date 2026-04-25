# Centralized Logging

Persistent, searchable log aggregation for all Docker containers on the homelab.

## Architecture

```
Docker containers (app, inngest, etc.)
    |
    v (Docker socket)
Alloy (log collector)
    |
    v (HTTP push)
Loki (log storage, 30-day retention)
    |
    v (query)
Grafana (web UI)
```

All three run as Kamal accessories on the `kamal` Docker network.

## Access

- **Grafana**: `http://homelab:3000` (Tailscale only, no login required)
- **Loki API**: `http://homelab:3100` (internal, used by Grafana)
- **Alloy debug UI**: `http://homelab:12345` (optional, for debugging collection config)

## Querying Logs

Open Grafana, go to **Explore** (compass icon in sidebar), select **Loki** datasource.

### Common queries

```logql
# All logs from all containers
{container=~".+"}

# App logs only
{container=~"evee-web.*"}

# Inngest logs
{container=~"evee-inngest.*"}

# Errors across everything
{container=~".+"} |~ "(?i)error"

# tRPC request logs
{container=~"evee-web.*"} |~ "trpc"

# Filter by time range
# Use the time picker in the top-right of Grafana
```

### Label filters

Alloy tags every log line with:
- `container` - container name (e.g. `evee-web-1`)
- `container_id` - Docker container ID
- `image` - Docker image name

## Frontend Observability (Faro)

Frontend errors, exceptions, and web vitals are captured by the [Grafana Faro Web SDK](https://grafana.com/oss/faro/) running in the browser.

### Data Flow

```
Browser (Faro SDK)
    |
    v (POST /api/collect)
API server (proxy)
    |
    v (HTTP forward)
Alloy (faro.receiver, port 12346)
    |
    v (loki.process -> loki.write)
Loki
    |
    v (query)
Grafana ("Frontend Observability" dashboard)
```

### What's Captured

- **JS errors**: uncaught exceptions, unhandled promise rejections
- **React crashes**: ErrorBoundary componentDidCatch with component stack
- **tRPC request failures**: path, type, error code
- **Web vitals**: LCP, FID, CLS (automatic via Faro)

### Querying Frontend Logs

```logql
# All frontend events
{source="faro", app="evee-web"} | json

# Errors only
{source="faro", app="evee-web"} | json | kind="error"

# tRPC request errors
{source="faro", app="evee-web"} | json | kind="error" |~ "tRPC"
```

### Dashboard

Open Grafana at `http://homelab:3000`, navigate to Dashboards, select **Frontend Observability**.

### Toast Notifications

Errors also trigger toast notifications in the UI via [sonner](https://sonner.emilkowal.ski/). Toasts auto-dismiss after 5 seconds and are deduped (same error won't toast more than once per 60 seconds).

## Configuration

Config files are baked into custom Docker images (GitOps, no manual host setup).

| Component | Config location | Image |
|-----------|----------------|-------|
| Loki | `infra/loki/loki-config.yaml` | `ghcr.io/0x63616c/evee-loki` |
| Alloy | `infra/alloy/config.alloy` | `ghcr.io/0x63616c/evee-alloy` |
| Grafana | `infra/grafana/datasource.yaml` | `ghcr.io/0x63616c/evee-grafana` |

To change config: edit the file, push to main, CI rebuilds the image, `kamal deploy` picks it up.

## Ports

| Service | Port |
|---------|------|
| Grafana | 3000 |
| Loki | 3100 |
| Alloy | 12345 |

## Data Retention

- Loki retains logs for **30 days** (configurable in `loki-config.yaml` via `retention_period`)
- Data stored on host at the `loki-data` directory managed by Kamal
- Grafana dashboards/settings stored in `grafana-data` directory

## RAM Usage

| Service | Estimated RAM |
|---------|--------------|
| Loki | ~100-200MB |
| Grafana | ~80-150MB |
| Alloy | ~30-50MB |
| **Total** | **~210-400MB** |

## Manual Accessory Management

```bash
# Boot individual accessories
kamal accessory boot loki
kamal accessory boot grafana
kamal accessory boot alloy

# Check logs of an accessory
kamal accessory logs loki
kamal accessory logs grafana
kamal accessory logs alloy

# Restart an accessory
kamal accessory reboot loki

# Remove and re-create
kamal accessory remove loki
kamal accessory boot loki
```
