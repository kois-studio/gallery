# Media upload and processing pipeline

## Proposed lifecycle

The first design should model media as a stateful process rather than treating upload as one synchronous request:

```text
selected → uploading → stored-original → processing → ready
                                      ↘ failed / retryable
```

Deletion, cancellation, retry, and publication while processing need explicit transitions.

## Required behaviors

- show per-file and batch progress;
- report failures instead of silently dropping files;
- validate size, declared type, detected content, and filename/path behavior;
- store originals separately from derivatives;
- generate at least thumbnail and display-size variants;
- make processing retryable and observable;
- prevent a failed derivative from being treated as a successful complete upload;
- define what happens when the operator restarts during processing;
- define cleanup for abandoned uploads and deleted galleries.

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

The first implementation may process in-process if the workload and failure behavior are acceptable. A separate worker or job system should be introduced only when real measurements justify it.
