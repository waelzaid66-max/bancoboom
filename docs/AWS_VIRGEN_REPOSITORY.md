# AWS production repository (`aws-virgen`)

This GitHub repo is the **AWS deployment canonical clone** for BANCO Store.

- **Code:** `main` is kept in sync with the primary monorepo (`-BANCO-CA-OOM-`) via merge (full history preserved).
- **Deploy path on EC2:** `/opt/banco/aws-virgen` (see `deploy/aws/scripts/deploy.sh`).
- **CD:** `.github/workflows/deploy.yml` runs on version tags `v*.*.*`.

Documentation index: [docs/DEPLOYMENT_GUIDES.md](docs/DEPLOYMENT_GUIDES.md)  
Full publish (merge + manifest + tag): [docs/AWS_VIRGEN_FULL_PUBLISH.md](docs/AWS_VIRGEN_FULL_PUBLISH.md)  
Finalization audit: [REPOSITORY_FINALIZATION_AUDIT.md](REPOSITORY_FINALIZATION_AUDIT.md)
