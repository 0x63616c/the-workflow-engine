-- Previously created implicitly via POSTGRES_DB env var on the postgres
-- accessory. Declared here so fresh volumes (disaster recovery, new envs)
-- get the same DB automatically via /docker-entrypoint-initdb.d.
CREATE DATABASE evee OWNER evee;
