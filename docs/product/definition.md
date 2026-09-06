# Product definition

## Status

This is a proposed product definition for the design phase. It is not an implementation contract yet.

## Problem

Photographers often deliver hundreds of event photographs through generic folders or file-transfer links. Those tools move files, but they provide weak presentation, poor browsing, limited selection workflows, and little photographer branding.

Photography SaaS products provide a better experience but introduce recurring cost and third-party control of the service and often include much more business functionality than a photographer needs for delivery.

## Product promise

Kois Gallery is an open-source, self-hosted photo-delivery platform for photographers.

> The simplest way to self-host beautiful client photo galleries.

The initial value is the combination of:

- photography-oriented presentation;
- self-hosted operation;
- photographer-controlled storage and infrastructure;
- reliable delivery of large image batches;
- simple visitor selection and download workflows;
- independence from the photographer’s portfolio website framework.

## Users

### Photographer/operator

Owns or operates a Gallery installation, uploads and organizes photographs, configures visibility and branding, shares galleries, and retrieves visitor selections.

### Visitor/client

Views a shared gallery, enters access credentials when required, browses on desktop or mobile, favorites or selects photographs, and downloads approved files.

### Self-hosting developer

Installs Gallery from a clean checkout or release, configures storage and public URL settings, upgrades the application, and restores data when necessary.

## First real validation user

Lino Fajardo is the first real photographer and beta user. His workflow is evidence for the product, not the product’s permanent audience, name, or scope. The reusable product must remain photographer-independent and must not embed Lino-specific assumptions.

## Product boundaries

Gallery is initially a photo-delivery system. It is not an invoicing system, CRM, contract manager, payment platform, print store, marketing automation system, or full photographer business-management suite.

Gallery is not initially a Kois-managed SaaS. Each photographer is expected to operate their own installation and infrastructure. A managed Kois-hosted offering would be a separate future product and complexity decision.

## Success evidence

The first release is successful when:

- Lino can install or receive a reproducible installation;
- a real event-sized batch can be uploaded without silent failures;
- visitors can browse effectively on mobile and desktop;
- the photographer can share a stable gallery URL;
- downloads and selections behave predictably;
- an independent developer can reproduce the setup from the README;
- observed friction becomes documented work rather than anecdotal memory.
