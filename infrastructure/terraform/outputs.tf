output "network_name" {
  description = "Bridge network used by the stack (Compose must use this as external)"
  value       = docker_network.app.name
}

output "postgres_volume_name" {
  value = docker_volume.postgres.name
}

output "mongodb_volume_name" {
  value = docker_volume.mongodb.name
}
