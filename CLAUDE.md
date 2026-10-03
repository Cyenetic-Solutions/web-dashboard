# Cyenetic Dashboard — Working Context

Read [AGENTS.md](AGENTS.md) first. Its repository rules also apply to Claude and other coding assistants.

This is a separate staff administration app, not a replacement for `cyenetic-frontend`. The local [master architecture](Cyenetic_Master_Architecture.md) and [HTML reference](design/index.html) travel with the repository so no sibling checkout is required. The architecture is a specification, not a completion claim.

Use the installed dependencies and pinned lockfile. Check [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for actual commands, trust boundaries and the current file layout. Check [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) before extending a module. Keep new features behind the existing authorization, validation and audit layers.

The current working slice is staff-authenticated, versioned content management with published public reads and an append-only audit trail. Service domains/subdomains are editable records with no fixed count. All other architecture areas must be explicitly implemented and tested before being described as available.

Do not copy the frontend's historical claims that testing tools are absent: this repository installs and runs them. Do not add fake successful email, upload, CRM, certificate or MFA flows. Preserve user changes and document implementation gaps plainly.
