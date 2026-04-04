# easy-devops-tutorial — local run + IaC helpers
# Requires: Docker, Docker Compose v2. Optional: terraform / ansible-playbook on PATH.

SHELL := /bin/bash
.DEFAULT_GOAL := help

ROOT := $(abspath .)
TF_DIR := $(ROOT)/infrastructure/terraform
PUPPET_DIR := $(ROOT)/infrastructure/puppet
ANSIBLE_DIR := $(ROOT)/infrastructure/ansible

# Terraform via official image if `terraform` is not installed (needs Docker socket).
TERRAFORM_BIN ?= $(shell command -v terraform 2>/dev/null)
TERRAFORM_IMG := hashicorp/terraform:1.9
TERRAFORM_DOCKER := docker run --rm \
	-v "$(ROOT):/workspace" \
	-v /var/run/docker.sock:/var/run/docker.sock \
	-w /workspace/infrastructure/terraform \
	$(TERRAFORM_IMG)

PUPPET_IMG := puppet/puppet-agent:latest
PUPPET_APPLY := docker run --rm --entrypoint /bin/bash \
	-v "$(ROOT):/workspace" \
	-w /workspace/infrastructure/puppet \
	$(PUPPET_IMG) -lc '/opt/puppetlabs/puppet/bin/puppet apply --modulepath=modules \
		--hiera_config=/workspace/infrastructure/puppet/hiera.yaml \
		/workspace/infrastructure/puppet/manifests/site.pp'

ANSIBLE_PLAYBOOK ?= ansible-playbook
COMPOSE ?= docker compose

.PHONY: help \
	run-up run-down run-logs run-ps \
	infra-puppet-apply infra-puppet-validate \
	infra-terraform-init infra-terraform-fmt infra-terraform-validate infra-terraform-plan infra-terraform-apply infra-terraform-destroy \
	infra-ansible-install infra-ansible-deploy infra-ansible-topics infra-ansible-verify infra-ansible-site \
	infra-full-iac env-file

help:
	@echo "Run (quickstart, no Terraform)"
	@echo "  make run-up          docker compose up --build -d"
	@echo "  make run-down        docker compose down"
	@echo "  make run-logs        docker compose logs -f"
	@echo "  make run-ps          docker compose ps"
	@echo ""
	@echo "IaC — Terraform (Docker network + volumes for docker-compose.iac.yml)"
	@echo "  make infra-terraform-init"
	@echo "  make infra-terraform-fmt"
	@echo "  make infra-terraform-validate"
	@echo "  make infra-terraform-plan"
	@echo "  make infra-terraform-apply"
	@echo "  make infra-terraform-destroy"
	@echo ""
	@echo "IaC — Puppet (renders infrastructure/generated/* via container)"
	@echo "  make infra-puppet-apply"
	@echo "  make infra-puppet-validate"
	@echo ""
	@echo "IaC — Ansible (from infrastructure/ansible; install collections first)"
	@echo "  make infra-ansible-install"
	@echo "  make infra-ansible-deploy     # IaC overlay (default)"
	@echo "  make infra-ansible-deploy-quick   # overlay=false"
	@echo "  make infra-ansible-topics"
	@echo "  make infra-ansible-verify"
	@echo "  make infra-ansible-site       # deploy + topics + verify"
	@echo ""
	@echo "IaC — one-shot local sequence"
	@echo "  make env-file            copy .env.example -> .env if missing"
	@echo "  make infra-full-iac      terraform apply, puppet, ansible site (needs .env)"
	@echo ""
	@echo "Compose with IaC overlay (after terraform apply):"
	@echo "  $(COMPOSE) -f docker-compose.yml -f docker-compose.iac.yml up --build -d"

# --- Run (quickstart) ---

run-up:
	$(COMPOSE) up --build -d

run-down:
	$(COMPOSE) down

run-logs:
	$(COMPOSE) logs -f

run-ps:
	$(COMPOSE) ps

# --- Terraform ---

infra-terraform-init:
	@if [ -n "$(TERRAFORM_BIN)" ]; then cd $(TF_DIR) && $(TERRAFORM_BIN) init; else $(TERRAFORM_DOCKER) init; fi

infra-terraform-fmt:
	@if [ -n "$(TERRAFORM_BIN)" ]; then cd $(TF_DIR) && $(TERRAFORM_BIN) fmt -check -recursive; else $(TERRAFORM_DOCKER) fmt -check -recursive; fi

infra-terraform-validate: infra-terraform-init
	@if [ -n "$(TERRAFORM_BIN)" ]; then cd $(TF_DIR) && $(TERRAFORM_BIN) validate; else $(TERRAFORM_DOCKER) validate; fi

infra-terraform-plan: infra-terraform-init
	@if [ -n "$(TERRAFORM_BIN)" ]; then cd $(TF_DIR) && $(TERRAFORM_BIN) plan; else $(TERRAFORM_DOCKER) plan; fi

infra-terraform-apply: infra-terraform-init
	@if [ -n "$(TERRAFORM_BIN)" ]; then cd $(TF_DIR) && $(TERRAFORM_BIN) apply; else $(TERRAFORM_DOCKER) apply -auto-approve; fi

infra-terraform-destroy: infra-terraform-init
	@if [ -n "$(TERRAFORM_BIN)" ]; then cd $(TF_DIR) && $(TERRAFORM_BIN) destroy; else $(TERRAFORM_DOCKER) destroy -auto-approve; fi

# --- Puppet ---

infra-puppet-apply:
	$(PUPPET_APPLY)

infra-puppet-validate:
	docker run --rm --entrypoint /bin/bash \
		-v "$(ROOT):/workspace" \
		-w /workspace/infrastructure/puppet \
		$(PUPPET_IMG) -lc 'set -e; for f in modules/easy_devops/manifests/*.pp manifests/*.pp; do \
			/opt/puppetlabs/puppet/bin/puppet parser validate "$$f"; done'

# --- Ansible ---

infra-ansible-install:
	cd $(ANSIBLE_DIR) && ansible-galaxy collection install -r requirements.yml

infra-ansible-deploy:
	cd $(ANSIBLE_DIR) && $(ANSIBLE_PLAYBOOK) -i inventory/hosts.yml playbooks/deploy.yml

infra-ansible-deploy-quick:
	cd $(ANSIBLE_DIR) && $(ANSIBLE_PLAYBOOK) -i inventory/hosts.yml playbooks/deploy.yml -e iac_compose_overlay=false

infra-ansible-topics:
	cd $(ANSIBLE_DIR) && $(ANSIBLE_PLAYBOOK) -i inventory/hosts.yml playbooks/kafka_topics.yml

infra-ansible-verify:
	cd $(ANSIBLE_DIR) && $(ANSIBLE_PLAYBOOK) -i inventory/hosts.yml playbooks/verify.yml

infra-ansible-site: infra-ansible-install
	cd $(ANSIBLE_DIR) && $(ANSIBLE_PLAYBOOK) -i inventory/hosts.yml playbooks/site.yml

# --- Combined ---

env-file:
	@test -f $(ROOT)/.env || cp $(ROOT)/.env.example $(ROOT)/.env
	@echo "Using $(ROOT)/.env (created from .env.example if it was missing)."

infra-full-iac: env-file infra-terraform-apply infra-puppet-apply
	@if ! grep -q '^POSTGRES_VOLUME_NAME=' "$(ROOT)/.env" 2>/dev/null; then \
		cat "$(ROOT)/infrastructure/generated/compose.env.fragment" >> "$(ROOT)/.env"; \
	fi
	@$(MAKE) infra-ansible-site
