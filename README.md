# Config Doctor

Tools for analyzing your repo configuration

# Projects

- [ESLint Doctor](packages/eslint-doctor/)
- ESLint Doctor Config (TBD)
- TS Doctor (TBD)

# Organization

This is a monorepo built on top of [Nx](https://nx.dev/).

## Project structure

Projects are placed in folders as `packages/{project name}`.

`README.md` files placed in project roots will be published to `npm`, so make sure it's targeted to consumers of the package, rather than contributors.

## Commands

Commands are executed using the `nx` CLI tool rather than `npm`. For example:

```Shell
nx test eslint-doctor
```

Additional commands can be found in the `project.json` file of each project root.
