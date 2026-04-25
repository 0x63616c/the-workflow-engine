allow_k8s_contexts("admin@homelab")

port_offset = int(os.getenv("PORT_OFFSET", "0"))

port_web = 4200 + port_offset
port_api = 4201 + port_offset
port_inngest = 8288 + port_offset

port_postgres = 5432 + port_offset

os.putenv("INNGEST_PORT", str(port_inngest))
os.putenv("POSTGRES_PORT", str(port_postgres))
docker_compose("docker-compose.yml")

ha_token = str(local("op read 'op://Homelab/Home Assistant Token/credential' --no-newline", quiet=True))
slack_bot_token = str(local("op item get 'Slack Bot (Evee)' --vault Homelab --fields label=slack_bot_token --reveal 2>/dev/null | tr -d '\\n'", quiet=True))
slack_app_token = str(local("op item get 'Slack Bot (Evee)' --vault Homelab --fields label=slack_app_token --reveal 2>/dev/null | tr -d '\\n'", quiet=True))
openrouter_api_key = str(local("op read 'op://Homelab/OpenRouter/credential' --no-newline", quiet=True))

local_resource(
    "api",
    serve_cmd="bun --watch apps/api/src/server.ts",
    serve_env={
        "PORT": str(4201),
        "PORT_OFFSET": str(port_offset),
        "DATABASE_URL": "postgresql://evee:evee@localhost:%d/evee" % port_postgres,
        "INNGEST_DEV": "1",
        "HA_TOKEN": ha_token,
        "SLACK_BOT_TOKEN": slack_bot_token,
        "SLACK_APP_TOKEN": slack_app_token,
        "OPENROUTER_API_KEY": openrouter_api_key,
    },
    deps=["apps/api/src"],
    resource_deps=["inngest", "postgres"],
    links=[
        link("http://localhost:%d" % port_api, "API"),
    ],
)

local_resource(
    "web",
    serve_cmd="bun run --cwd apps/web dev --port %d" % port_web,
    serve_env={
        "API_PORT": str(port_api),
    },
    deps=["apps/web/src"],
    resource_deps=["api"],
    links=[
        link("http://localhost:%d" % port_web, "Web"),
    ],
)
