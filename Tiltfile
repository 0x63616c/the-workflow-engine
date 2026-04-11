port_offset = int(os.getenv("PORT_OFFSET", "0"))

port_web = 4200 + port_offset
port_api = 4201 + port_offset
port_ws = 4202 + port_offset
port_inngest = 8288 + port_offset

os.putenv("INNGEST_PORT", str(port_inngest))
docker_compose("docker-compose.yml")

local_resource(
    "api",
    serve_cmd="bun --watch apps/api/src/server.ts",
    serve_env={
        "PORT": str(4201),
        "PORT_OFFSET": str(port_offset),
        "INNGEST_DEV": "1",
    },
    deps=["apps/api/src"],
    resource_deps=["inngest"],
    links=[
        link("http://localhost:%d" % port_api, "API"),
        link("ws://localhost:%d" % port_ws, "WebSocket"),
    ],
)

local_resource(
    "web",
    serve_cmd="bun run --cwd apps/web dev --port %d" % port_web,
    deps=["apps/web/src"],
    resource_deps=["api"],
    links=[
        link("http://localhost:%d" % port_web, "Web"),
    ],
)
