# Gallery landing instructions

This directory is the public marketing and documentation website for Kois Gallery. It is a separate Astro static site and must not become a second implementation of the Angular/NestJS product.

## Content boundary

- Describe only implemented behavior or clearly label future work as planned.
- Do not claim that Gallery is licensed open source until the root project publishes a license.
- Do not describe Kois-managed hosting, SaaS accounts, S3 support, selections, SDKs, or MCP as available product capabilities.
- The self-hosting instructions in the root `deploy/` directory and the technical/product context in the root `docs/` directory are the sources of truth.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
