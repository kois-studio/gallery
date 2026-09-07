# Backup and recovery

## Design status

This is a required operational design area. Gallery now provides a read-only storage-integrity command and an automated synthetic two-store restore test. A container-level/operator-run restore has not yet been exercised as a release gate.

The first beta contract is an operator-run backup and restore procedure, not a Gallery-managed backup service. Gallery must make the two-store limitation explicit and provide a way to detect missing or extra media objects after recovery.

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

## Proposed first-beta contract

- The operator backs up the SQLite database and the complete configured storage root, including originals, derivatives, and any temporary or job-recovery data the application declares durable.
- The preferred consistent snapshot is a short maintenance window: stop or quiesce writes and processing, take the database backup and storage snapshot, then resume. If the host provides coordinated filesystem snapshots, those may be used; Gallery does not promise cross-store atomicity.
- A backup is not considered valid until it can restore into a clean installation using the same or a documented compatible Gallery version.
- Restore starts with the application stopped, restores both stores, runs migrations only when the upgrade path says to do so, then runs reconciliation. Missing derivatives can be requeued with the confirmation-gated `npm run storage:repair -- --confirm-repair` command; database rows pointing to missing originals are marked failed and require operator attention. Unreferenced files are reported before any deletion and are never removed automatically.
- The operator must verify a restored gallery by opening a shared link, loading representative thumbnails and display images, downloading an original, and checking counts. Verification must use synthetic or approved assets.
- The operator must run `npm run storage:verify` inside the restored installation. A non-zero result requires review of missing originals, missing ready-photo derivatives, or unreferenced files before the installation is exposed. After an approved repair, run the command again and record the result.
- In-flight uploads and jobs at the time of a snapshot are not promised to resume exactly. They must be reported as incomplete and safely retried or discarded according to the documented state machine.
- Deletion and expiration do not erase existing backups. Retention and secure disposal remain operator responsibilities.

RPO, RTO, backup frequency, retention duration, encryption-at-rest, and off-host replication remain evidence- and operator-policy questions. The project must not publish numeric guarantees before Lino’s storage risk and the supported hosting path are known.

The first beta must include at least one restore exercise using synthetic or approved test assets. The automated local exercise is an initial evidence point; the container-level/operator-run result belongs in the project work queue and release evidence.
