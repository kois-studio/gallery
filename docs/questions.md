# Open design questions

These questions remain intentionally open. They should be answered through evidence, comparison, or an explicit ADR before the affected implementation slice is treated as settled.

## Product and workflow

- Which exact event workflow should Lino use for the first private beta?
- What does “download a gallery” mean for hundreds of files: individual files, selected files, generated archive, or several options?
- Should selections persist in one browser, across devices through a share token, or through an identified visitor flow?
- Is expiration required for the first beta, and what should expire: access, metadata, originals, or derivatives?
- What branding controls are essential for the first real user?

## Runtime and framework

- Which frontend/runtime combination best supports a self-hosted single application and future headless use?
- Is a single full-stack TypeScript runtime appropriate, or is a separate backend justified?
- Which package manager, ORM/query layer, migration tool, and test stack fit the deployment and contributor constraints?

## Authentication and authorization

- Should the first installation use local credentials, an external identity provider, or a deliberately narrower administrator mechanism?
- How are first-admin setup, password reset, sessions, logout, and credential rotation handled without requiring a Kois service?
- How are visitor password-protected galleries authorized without exposing reusable secrets in URLs or logs?
- When multiple photographers or administrators are introduced, what are the ownership and membership rules?

## Upload and processing

- Should the first upload path be server-mediated, direct-to-storage, or support both later?
- What file formats and metadata are supported initially?
- Which processing library and runtime constraints are acceptable on modest self-hosted hardware?
- Is in-process processing sufficient for the first beta, or is a durable job model required immediately?
- How are retries, cancellations, restarts, and orphaned objects reconciled?

## Storage and operations

- What is the exact storage interface that works for both local files and S3-compatible storage?
- How are private media read, streamed, cached, and downloaded for each provider?
- What backup and restore guarantees can the documentation responsibly promise?
- What health, logging, and diagnostic behavior is required for an operator without deep engineering experience?

## Public project and OSS

- Which license best matches the desired adoption and network-copyleft goals?
- When should a public repository become a licensed open-source release?
- What contribution, security-reporting, release, and compatibility promises are sustainable for Kois?
- When is a public API stable enough for an SDK or MCP integration?
