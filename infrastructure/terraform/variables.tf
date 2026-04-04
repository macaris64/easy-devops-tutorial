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

# Compose / service-b secrets — override via terraform.tfvars or TF_VAR_* (do not commit real values).
variable "postgres_password" {
  type        = string
  sensitive   = true
  description = "POSTGRES_PASSWORD for Postgres and service-b DSN; default matches .env.example"
  default     = "postgres"
}

variable "jwt_secret" {
  type        = string
  sensitive   = true
  description = "JWT_SECRET for service-b; default matches .env.example"
  default     = "change-me-in-production"
}

variable "bootstrap_admin_password" {
  type        = string
  sensitive   = true
  description = "BOOTSTRAP_ADMIN_PASSWORD for service-b; default matches .env.example"
  default     = "admin123"
}

variable "seed_demo_password" {
  type        = string
  sensitive   = true
  description = "SEED_DEMO_PASSWORD for service-b; default matches .env.example"
  default     = "demo123"
}
