# Branching & Deployment Workflow

This repository uses a two-tier branching model integrated with **GitHub Actions CI** and **Vercel**:

## Branches

- `main` — **Production branch** (deployed to your primary production domain on Vercel). Direct pushes should be blocked via GitHub Branch Protection.
- `develop` — **Staging / Integration branch** (deployed as a persistent Preview environment on Vercel). All new features and fixes merge here first.
- `feat/<name>`, `fix/<name>`, `chore/<name>` — Short-lived working branches created from `develop`.

## Standard Workflow

1. Create a branch from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/your-feature-name
   ```
2. Make changes and verify locally:
   ```bash
   npm run type-check
   npm run lint
   npm run format:check
   npm run build
   ```
3. Push your branch and open a Pull Request into `develop`.
4. After CI passes and Vercel Preview looks good, merge into `develop`.
5. When ready for production, open a Pull Request from `develop` into `main`.
