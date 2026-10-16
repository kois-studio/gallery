# Checkpoint — release hardening priority

## TL / PM / PO review

Gallery is not finished and is not beta-ready. The implemented vertical slice
is coherent enough to stop adding product scope and focus on release evidence.
The remaining work is primarily verification in a real operator environment,
not another feature-building phase.

## Decision

The next local priority is to make the self-hosting boundary explicit and safe:

- bind the Compose container to loopback by default;
- allow the host port to be configured without changing the container port;
- allow the public CORS origin to be configured;
- provide a minimal Caddy reverse-proxy/TLS recipe;
- keep live DNS, TLS, forwarded-header, cookie, and firewall verification as an
  explicit external release gate.

The updated Compose installation was recreated locally and verified healthy on
`127.0.0.1:3000`; `/api/ready` returned `ready`, direct `/data/gallery.db`
returned `404`, and Docker reported the published binding as
`127.0.0.1:3000->3000/tcp`.

The packaged browser journey was rerun after the change: the Angular build,
NestJS packaging, administrator publish flow, visitor browse flow, and
individual original download passed in Playwright.

This does not make the product beta-ready by itself. It makes the intended
operator path concrete and reduces the chance that a first deployment exposes
the application directly over an unintended network interface.

## Remaining release gates

1. Run an approved representative camera/event workload.
2. Exercise storage permission/full-disk behavior on the supported host shapes.
3. Verify the Caddy or equivalent proxy path with real TLS and secure cookies.
4. Complete manual responsive, accessibility, and performance review.
5. Observe the real photographer workflow and decide whether selections belong
   in the beta.
6. Choose and publish the OSS license before a meaningful stable release.
