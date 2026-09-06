# Backup and recovery

## Design status

This is a required operational design area, not an implemented guarantee.

Gallery data has at least two coordinated components:

- SQLite metadata and configuration;
- original and derived photo objects.

A database-only backup is insufficient. A media-only backup may lose gallery structure, selections, visibility, or processing state.

## Initial recovery contract to define

Before beta release, document:

- what the operator must back up;
- how often backups should run;
- retention expectations;
- whether database and media snapshots are coordinated;
- how to restore into a clean installation;
- how to verify restored object references and derivatives;
- what happens to in-flight uploads and processing jobs;
- how deletion and expiration interact with backups;
- how an operator tests recovery without exposing private photographs.

The first beta must include at least one restore exercise using synthetic or approved test assets. The result belongs in the project work queue and release evidence.
