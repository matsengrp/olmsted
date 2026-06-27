# Contributing to Olmsted

Thanks for your interest in contributing to Olmsted! This document explains how
to report problems, ask for help, and contribute code or documentation.

## Reporting issues

Please use the [GitHub issue tracker](https://github.com/matsengrp/olmsted/issues)
to report bugs or request features. Before opening a new issue, search the
existing issues to see whether it has already been reported.

A good bug report includes:

- What you did, what you expected, and what actually happened
- The browser and operating system you were using
- A minimal example dataset or the steps needed to reproduce the problem, where possible
- Any errors shown in the browser's developer console

Problems with data preparation (rather than the web application itself) belong
in the [olmsted-cli](https://github.com/matsengrp/olmsted-cli) issue tracker.

## Seeking support

If you have a question about using Olmsted that is not a bug report, please open
an issue with the question and we will do our best to help. Most usage questions
are answered by the [README](./README.md) and the schema documentation linked
there.

## Contributing code or documentation

We welcome pull requests. To get started:

1. Fork the repository and create a topic branch from `main`.
2. Set up a development environment by following [DEVELOPMENT.md](./DEVELOPMENT.md)
   (`npm install`, then `npm start`).
3. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for an overview of the data flow,
   Redux store, and Vega integration, and [DESIGN.md](./DESIGN.md) for
   load-bearing architectural decisions before proposing structural changes.
4. Make your change, including tests where appropriate.
5. Before opening a pull request, work through
   [PRE-MERGE-CHECKLIST.md](./PRE-MERGE-CHECKLIST.md). At a minimum, run:

   ```bash
   npm run format        # Prettier
   npm run lint          # ESLint
   npm test              # unit tests
   npm run build         # production build
   ```

6. Open a pull request against `main` describing the change and linking any
   related issue. A maintainer will review it.

We squash-merge pull requests, so a clean final state matters more than a tidy
intermediate commit history.

## Code of conduct

Please be respectful and constructive in all project spaces. We are committed to
providing a welcoming and harassment-free experience for everyone. Report
unacceptable behavior by opening an issue or contacting the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the
project's [GNU Affero General Public License v3](./LICENSE.txt).
