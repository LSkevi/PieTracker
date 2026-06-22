# 4. OCR receipt parsing via Google Gemini

## Status

Accepted

## Context

A convenience feature lets users snap or upload a receipt and have an expense
prefilled (amount, date, merchant, category). Building a bespoke OCR + parsing
pipeline (text detection plus field extraction) was out of scope; a hosted
multimodal model can read the image and return structured fields in one call.

## Decision

Use **Google Gemini (`gemini-2.5-flash`)** through the `google-generativeai`
SDK, configured with `GEMINI_API_KEY` from the environment. The
auth-required `POST /ocr/receipt` endpoint validates/normalizes the uploaded
image with Pillow, sends it to Gemini with a bilingual FR/EN prompt asking for
strict JSON, strips markdown code fences from the reply, then parses and
sanitizes the fields (amount coercion, `DD/MM/YYYY` -> ISO date) before
returning an `OCRResponse`. A `GET /ocr/test` endpoint reports whether the key
is configured.

## Consequences

- **Pro:** A single API call replaces an entire OCR + NLP pipeline; the Flash
  model is fast and inexpensive, and the structured-JSON prompt keeps client
  parsing simple.
- **Pro:** The endpoint hard-fails gracefully to `{success: false, error}` on
  any exception, and OCR is optional — the app works without the key.
- **Con:** Receipt images are sent to a third-party service (privacy/data
  residency consideration for finance data) and parsing depends on the model
  honouring the JSON-only instruction, hence the defensive fence-stripping and
  sanitization.
- **Con:** Cost/quota and latency now depend on an external provider; the prompt
  and date-format assumptions (FR-style `DD/MM/YYYY`) are tuned heuristics, not
  guarantees.
