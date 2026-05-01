# Codex Workspace Layout

This `.codex` directory is organized for Codex skill discovery and maintenance.

## Structure

```text
.codex/
├── skills/              # Installed Codex skills loaded directly by Codex
│   └── <skill-name>/
│       ├── SKILL.md     # Required skill metadata and instructions
│       ├── agents/      # Optional UI metadata
│       ├── scripts/     # Optional executable helpers
│       ├── references/  # Optional documentation loaded on demand
│       └── assets/      # Optional templates, images, fonts, or other resources
├── skill-collections/   # Large external skill collections kept as source material
└── docs/                # Documentation and media that are not loaded as skills
```

## Rules

- Put active skills in `skills/<skill-name>/`.
- Each active skill must contain `SKILL.md`.
- Use lowercase, digits, and hyphens for skill folder names.
- Keep large third-party collections in `skill-collections/` until individual skills are selected for installation.
- Keep README files, cover images, and other catalogue material in `docs/`, not inside `skills/`.

