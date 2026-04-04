# Gitignored fragment merged into project .env on the IaC path (see Makefile / CI).
resource "local_sensitive_file" "terraform_env_fragment" {
  filename = "${path.root}/../generated/terraform.env.fragment"
  content  = <<-EOT
# easy-devops terraform-managed secrets
POSTGRES_PASSWORD=${var.postgres_password}
JWT_SECRET=${var.jwt_secret}
BOOTSTRAP_ADMIN_PASSWORD=${var.bootstrap_admin_password}
SEED_DEMO_PASSWORD=${var.seed_demo_password}
EOT
}
