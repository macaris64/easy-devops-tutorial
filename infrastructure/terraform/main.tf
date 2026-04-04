# Docker network and volumes for the IaC compose path.
# Use with: docker compose -f docker-compose.yml -f docker-compose.iac.yml
# Do not mix with plain `docker compose up` on the same machine without
# destroying these resources first (name collision on app-network).

resource "docker_network" "app" {
  name = "app-network"
}

resource "docker_volume" "postgres" {
  name = var.postgres_volume_name
}

resource "docker_volume" "mongodb" {
  name = var.mongodb_volume_name
}
