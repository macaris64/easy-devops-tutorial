variable "postgres_volume_name" {
  type        = string
  description = "Docker volume name for PostgreSQL data; must match docker-compose.iac.yml"
  default     = "easy_devops_postgres_data"
}

variable "mongodb_volume_name" {
  type        = string
  description = "Docker volume name for MongoDB data; must match docker-compose.iac.yml"
  default     = "easy_devops_mongodb_data"
}
