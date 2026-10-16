# ADR 0014: MIT license

- **Status:** Accepted
- **Date:** 2026-10-17
- **Supersedes:** None
- **Superseded by:** None

## Context

The repository has been public without a license, so reuse rights could not be assumed (GAL-005). Gallery is a self-hosted web application. The candidates were MIT, GPL-3.0, and AGPL-3.0:

- GPL-3.0 only requires sharing changes when the software is distributed. Gallery is normally run as a website rather than distributed, so for most real use it protects little more than MIT does.
- AGPL-3.0 also requires sharing changes when a modified version is offered over a network. It would stop a third party from running a closed, improved hosted Gallery, and is common among self-hosted photo applications. It also deters some companies and contributors, and adds compliance questions for every operator who modifies the code.
- MIT allows any use, including closed hosted services, with only the copyright and license notice preserved.

## Decision

Gallery is released under the MIT license, in `LICENSE` at the repository root.

Gallery's first purpose is to be useful to photographers and to demonstrate the practice's work. Broad, friction-free adoption serves that better than protecting a possible future Kois-hosted service, which remains a hypothesis rather than a plan.

## Consequences

- Anyone may use, modify, self-host, or sell services around Gallery, including closed derivatives, as long as they keep the notice.
- A competing closed hosted service built on Gallery is permitted. Accepting that is part of this decision.
- Releases made under MIT stay MIT permanently. A future change could only apply to later versions and, once outside contributions exist, would need the contributors' agreement.
- The production dependencies are MIT, ISC, BSD, 0BSD, and Apache-2.0, plus sharp's bundled libvips binaries under LGPL-3.0-or-later. The LGPL component is used as a separate, replaceable library and keeps its own license notice in the container image; this is compatible with an MIT application.

## Alternatives considered

- **AGPL-3.0:** rejected for now; the protection it offers matters mainly to a hosted-service business that does not exist.
- **GPL-3.0:** rejected because its distribution trigger rarely applies to a web application.
- **Apache-2.0:** viable, with an explicit patent grant; MIT was preferred for simplicity and familiarity.
