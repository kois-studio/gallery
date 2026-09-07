# Media upload and processing pipeline

## Design status

The first implementation is functional but not beta-ready. The server-mediated upload, local original storage, durable job rows, in-process worker, Sharp derivatives, ready-only cover selection, cancellation, and integrity checks now exist; representative workload measurements and full release exercises remain outstanding.

## Implemented lifecycle

The first design should model media as a stateful process rather than treating upload as one synchronous request:

```text
selected → uploading → stored-original → processing → ready
                                      ↘ failed / retryable
                                      ↘ cancelled
```

The first implementation uses a server-mediated multipart upload and an in-process worker backed by durable SQLite job rows:

```text
browser → bounded upload endpoint → temporary file
                                  → original object + photo row
                                  → queued processing job
                                  → thumbnail/display variants
                                  → ready or retryable failure
```

The request may acknowledge each file once the original and metadata are durable; derivative generation must not make a batch request hold open for the whole workload. A two-job concurrency limit protects modest hardware. A separate worker process, queue, direct-to-storage upload, and resumable protocol are deferred until measurements demonstrate that the single-process model is inadequate.

Cancellation now has an explicit administrator transition. Deletion and publication while processing still need separate lifecycle decisions.

## Required behaviors

- show per-file and batch progress;
- report failures instead of silently dropping files;
- validate size, declared type, detected content, and filename/path behavior;
- store originals separately from derivatives;
- generate a WebP thumbnail and display-size variant with Sharp, applying EXIF orientation and stripping derivative metadata;
- make processing retryable and observable;
- prevent a failed derivative from being treated as a successful complete upload;
- define what happens when the operator restarts during processing;
- define cleanup for abandoned uploads and deleted galleries.

## Large-download strategy

The first slice supports individual original downloads through an authorization-aware streaming response. The server must stream from the storage boundary, apply bounded request and response behavior, set a safe content disposition, and avoid buffering an entire original or gallery in application memory. Direct storage paths are never the public contract.

“Download a gallery” is deliberately not defined as a synchronous ZIP operation. If Lino requires batch delivery, the later design must create an asynchronous archive job with a durable status, authorization tied to the gallery access context, limits on file count/total bytes, temporary storage, expiry, cleanup, and a clear failure/retry policy. A reverse proxy or object-storage handoff may be evaluated after the application’s authorization has succeeded, but it cannot bypass that boundary.

## State and failure rules

- A photo row is created with a server-generated ID and an idempotency key for the upload attempt. Repeated client retries must not create duplicate logical photos when the same attempt is retried.
- Original bytes are written to a temporary location, validated, and atomically moved into their final key before the photo is considered stored.
- A processing job claims work with an attempt and timestamp. On restart, stale claims become retryable; queued jobs are picked up by the in-process worker.
- Variant keys are deterministic from the photo ID and variant name. A retry may replace an incomplete output but must not mark the photo ready until both required variants are finalized.
- Required variants are thumbnail and display size. The first implementation uses 480px/2400px WebP variants; representative camera-file measurements may revise these limits through a later decision.
- A failed derivative leaves the original available for an explicit retry or operator repair. It does not make the photo publishable when a required variant is missing.
- Gallery publication must reject or clearly quarantine photos that are not ready; the beta recommendation is to block publication until every uploaded photo is ready, with a later choice for partial galleries.
- Cancellation marks pending or processing work as cancelled, prevents later worker claims/completion, removes the original and known derivatives, and keeps the cancelled state visible to the administrator. Abandoned multipart temporary files older than 24 hours are removed during startup.
- Shutdown stops new processing claims and waits for active work to finish. If the process is terminated while work is active, the next startup requeues interrupted jobs; the restore/restart behavior remains part of release verification.

## Performance questions

Before selecting an image library or worker design, test:

- representative camera file sizes and formats;
- memory and CPU use;
- concurrent uploads;
- mobile browsing of large galleries;
- interrupted uploads;
- storage growth;
- derivative generation time;
- behavior on modest self-hosted hardware.

The first implementation processes in-process with Sharp. The required evidence is the synthetic workload plan in `docs/work/TODO.md`, including file counts, sizes, formats, memory ceiling, processing time, restart behavior, and storage growth. The architecture remains subject to revision if that evidence shows the single-process model is inadequate.
