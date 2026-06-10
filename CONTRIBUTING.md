# Contributing to Vaultic Trust

Thank you for helping improve Vaultic Trust. This guide covers how we work on the repo and what we expect in contributions.

## About the project

Vaultic Trust is a real-world asset tokenization platform for Rwanda and Africa, built on Stellar with Soroban smart contracts and a Next.js frontend.

Read the [README](README.md) for architecture, deployment, and local setup.

## How to contribute

You can help by:

- Fixing bugs or open issues
- Proposing features with clear use cases
- Improving documentation or developer experience

Contributions flow through GitHub Issues and Pull Requests.

### Before you start

- Search existing issues and pull requests to avoid duplicate work.
- Keep pull requests focused: one concern per PR when possible.
- Match existing code style. Prettier and ESLint configs live under `packages/nextjs/`.
- When reporting bugs, include steps to reproduce, expected vs actual behavior, and screenshots if relevant.

### Issues

Use issues to report bugs, propose features, or discuss changes before opening a large PR.

If you plan to work on an existing issue, comment on it so others know it is in progress.

### Pull requests

We use a fork-and-pull workflow:

1. Fork the repository
2. Create a branch with a descriptive name
3. Make your changes and commit with a clear message
4. Push to your fork and open a PR against `main`
5. Link the related issue when applicable

Good pull requests include:

- A title that states what changed and why
- A short description with bullet points for non-obvious changes
- Notes on how you tested the change

Maintainers may request updates before merge. Once approved, we typically squash-and-merge to keep history readable.

## Development

From the repo root:

```bash
yarn install
yarn start          # frontend at http://localhost:3000
yarn next:build     # production build check
yarn next:lint      # lint
```

Soroban contracts live in `packages/soroban-contracts/`. See the README for deployment steps.

## Questions

For product, partnership, or support inquiries, use the contact email on the app's Support page (`/support`) or visit [vaultictrust.com](https://vaultictrust.com).
