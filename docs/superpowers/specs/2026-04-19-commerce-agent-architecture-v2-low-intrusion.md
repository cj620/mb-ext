# Commerce Agent Architecture V2 (Low Intrusion)

Date: 2026-04-19
Status: Proposed baseline for near-term implementation
Supersedes: the near-term implementation strategy in
`2026-04-18-commerce-agent-architecture-design.md`

## Purpose

This document defines a low-intrusion architecture for Commerce Agent inside
the current Page Agent monorepo.

The goal is not to fully productize Commerce Agent in one step. The goal is to
introduce the right layers, preserve the current project's stability, and make
later extraction possible without rewriting the first version.

## Design Mottos

- Main flow stays thin. Edge cases live outside.
- Modules may cooperate. They may not mutually bind.
- When new complexity arrives, add a layer instead of stuffing a layer.

These mottos are hard constraints for all follow-up changes.

## Why V2 Exists

The original architecture proposal assumed Commerce Agent should immediately
become a new multi-package product line:

```text
commerce-agent-core
commerce-agent-tools
commerce-agent-ui
commerce-agent-extension
```

That shape is clean in theory, but it is too large for the current goal:
architecture-first validation with minimal disturbance to the existing repo.

The current repository already has useful foundations:

- A browser extension host with a side panel UI.
- `MultiPageAgent` on top of `PageAgentCore`.
- Existing process-oriented `history` and `activity` rendering.
- Local storage for session history.

V2 keeps those foundations in place and adds Commerce Agent as a layered
capability inside the existing extension first.

## First-Phase Goals

In scope:

- Keep the existing extension as the host product.
- Add a separate commerce result model without rewriting `PageAgentCore`.
- Separate process feedback from business results.
- Reserve a compact ResultCard Dock slot in the side panel.
- Support product capture and listing optimization as the first commerce flows.
- Persist conversations, result cards, and active card state locally.
- Make future extraction to dedicated workspace packages possible.

Out of scope:

- Immediate creation of new workspace packages.
- Rewriting `@page-agent/ui` or the existing generic Panel abstraction.
- Rewriting `PageAgentCore` around commerce concepts.
- ERP integration.
- Supplier search.
- Compliance scanning.
- Cloud sync.
- Fully polished Dock interactions and visual design.

## Core Strategy

Commerce Agent will first be introduced as soft layers inside:

```text
packages/extension/src/commerce/
```

This allows the team to validate the architecture before changing workspace
topology, publish flow, or package ownership.

## Layer Model

Use the following internal layer split:

```text
packages/extension/src/commerce/
  domain/
  application/
  runtime/
  ui/
  features/
```

### domain

Pure business contracts.

Responsibilities:

- `ResultCard` and related types.
- `ConversationMessage`.
- `ToolResultEnvelope`.
- `ToolContext`.
- `SourcePlatform`.
- Summary/detail schemas.
- Validation helpers.

Non-responsibilities:

- React rendering.
- Chrome APIs.
- DOM extraction.
- LLM calls.
- Persistence.

### application

Use cases and workflow orchestration.

Responsibilities:

- `captureCurrentProduct`.
- `optimizeActiveProduct`.
- Use-case level orchestration.
- Ports/interfaces that describe outside dependencies.

Non-responsibilities:

- Page selectors.
- IndexedDB implementation.
- React components.
- Chrome runtime calls.

### runtime

Adapters and edge-case implementations.

Responsibilities:

- Current page runtime access.
- Platform extractors.
- Local persistence adapters.
- LLM adapters.
- Error translation from runtime concerns to business concerns.

Non-responsibilities:

- Owning UI layout.
- Defining domain contracts.
- Embedding business workflows inside side panel components.

### ui

Commerce-specific rendering components.

Responsibilities:

- Message stream presentation additions when needed.
- ResultCard Dock.
- ResultCard renderers.
- Commerce-specific card detail views.

Non-responsibilities:

- Calling Chrome APIs directly.
- Reading the page directly.
- Directly owning domain mutations.

### features

Assembly layer for the extension product.

Responsibilities:

- Wire `application`, `runtime`, and `ui` together.
- Expose hooks or controller-style interfaces to the side panel.
- Keep integration code out of `App.tsx`.

Non-responsibilities:

- Becoming a new dumping ground for business logic.

## Dependency Direction

Allowed direction:

```text
application -> domain
runtime -> application + domain
ui -> domain
features -> application + runtime + ui + domain
```

Hard constraints:

- `domain` must not depend on any other commerce layer.
- `ui` must not import runtime adapters directly.
- `runtime` must not import UI code.
- `features` may assemble modules, but must not absorb use-case logic.
- No bidirectional dependencies between commerce layers.

## Keep Existing Foundations Stable

The first phase should preserve the current project's major abstractions:

- Keep `packages/core/src/PageAgentCore.ts` as the general agent runtime.
- Keep `packages/extension/src/agent/MultiPageAgent.ts` as the extension host
  runtime wrapper.
- Keep existing `history` and `activity` rendering for process feedback.
- Keep generic `@page-agent/ui` untouched in the first phase.

Commerce capabilities should be added around these layers, not folded into
their core responsibilities.

## Two Parallel Streams

The current extension already has structured process output. V2 formalizes that
it is a different stream from business result output.

### Process Stream

Purpose:

- Explain what the agent is doing.
- Keep technical execution traceability.
- Preserve existing debugging and history views.

Current backing model:

- `history`
- `activity`
- `HistoricalEvent`
- `EventCard`
- `ActivityCard`

Examples:

- thinking
- tool execution
- retry
- observation
- technical error
- done output

### Result Stream

Purpose:

- Hold reusable business results.
- Support active result references such as "optimize this title".
- Provide local persistence for durable output.
- Feed the compact Dock and future detail views.

New backing model:

- `ResultCard`
- `ResultCardUpdate`
- `activeResultCardId`
- Result card store

Examples:

- product summary from current page
- listing copy variants
- recoverable business error card

### Rules Between the Two Streams

- Do not mirror every process event into a result card.
- `history/activity` stay process-oriented.
- `ResultCard` stays business-oriented.
- Technical execution errors stay in the process stream.
- Business recoverable errors may appear as `error_report` result cards.
- First phase does not require a persistent `task_progress` result card.
  Existing process cards already cover most progress needs.

## Tool Output Contract

Quick actions and natural-language commands must use the same application
use-case entrypoints.

Use a structured envelope:

```ts
type CommerceToolResultEnvelope = {
  message: string
  resultCards?: ResultCard[]
  updates?: ResultCardUpdate[]
}
```

Rules:

- `message` goes to the conversation/process surface.
- `resultCards` create new business results.
- `updates` mutate existing result cards.
- The side panel should route the envelope, not reinterpret tool output ad hoc.

## ResultCard Model

Every result card should separate `summary` from `detail`.

```ts
type ResultCard<TSummary = unknown, TDetail = unknown> = {
  id: string
  type: ResultCardType
  title: string
  summary: TSummary
  detail?: TDetail
  actions?: ResultCardAction[]
  createdAt: number
  updatedAt: number
}
```

Rules:

- Dock reads `summary`, not `detail`.
- Detail views read `detail`.
- New fields should prefer growing `detail` first.
- `summary` should stay intentionally small and stable.

## First-Phase ResultCard Types

Implement first:

- `product`
- `listing_copy`
- `error_report`

Reserve for later:

- `task_progress`
- `supplier_match`
- `competitor_analysis`
- `compliance_report`
- `erp_push_result`

## Dock Architecture

The ResultCard Dock must stay compact.

It is not a second conversation feed. It is a lightweight anchor for the active
business result.

First-phase constraints:

- Dock sits between the message area and the composer.
- Dock defaults to the active result card only.
- Dock reads only card summary plus a small action set.
- Dock must remain compact rather than becoming a scrolling content area.
- Full details belong in a later detail view, not in the Dock body.

This means the first phase only needs a Dock slot and a compact active-card
renderer. Expanded interactions can come later.

## Product Dock Summary Contract

For `product`, the Dock summary is intentionally fixed to the smallest useful
set:

```ts
type ProductCardSummary = {
  imageUrl?: string
  title: string
  priceText?: string
  categoryText?: string
}
```

Rules:

- Show one main image only.
- Title should be truncated to stay compact.
- Price is a primary summary field.
- Category is optional and may be hidden when unavailable.
- Brand, bullets, specs, ASIN, and other rich fields belong in `detail`.

## Local Persistence Strategy

Do not overload the existing session-history storage in the first pass.

Add a commerce-specific persistence layer under the commerce runtime/state area.

Suggested stores:

- `conversations`
- `messages`
- `result_cards`
- `ui_state`
- `settings`

Minimum first-phase persisted state:

- conversation messages
- result cards
- active result card id
- basic settings / feature flags
- schema version

## Use Cases

### captureCurrentProduct

Responsibility:

- Read current page context through runtime ports.
- Detect platform.
- Run the platform extractor.
- Normalize extracted product data.
- Return a `product` result card or a recoverable `error_report`.

### optimizeActiveProduct

Responsibility:

- Read the active product card.
- Build listing optimization input.
- Call an LLM adapter through a port.
- Return a `listing_copy` result card.

## Platform Strategy

Amazon is the first extractor target.

Rules:

- Prefer deterministic extraction with selectors and parser helpers.
- Do not make full-page LLM parsing the main path for product capture.
- Platform-specific variance belongs in extractor strategies under runtime.
- Unsupported or degraded states should produce recoverable business errors.

## Suggested Directory Skeleton

```text
packages/extension/src/commerce/
  domain/
    ResultCard.ts
    ResultCardType.ts
    ResultCardUpdate.ts
    ConversationMessage.ts
    ToolContext.ts
    ToolResultEnvelope.ts
    SourcePlatform.ts
  application/
    use-cases/
      captureCurrentProduct.ts
      optimizeActiveProduct.ts
    ports/
      CurrentPagePort.ts
      ProductExtractionPort.ts
      ListingCopyPort.ts
      ResultCardRepository.ts
  runtime/
    page/
      CurrentPageRuntime.ts
    extractors/
      amazon/
        AmazonProductExtractor.ts
        amazonSelectors.ts
        parseAmazonProduct.ts
    persistence/
      commerce-db.ts
      conversation-store.ts
      result-card-store.ts
      settings-store.ts
    llm/
      ListingCopyLlmAdapter.ts
  ui/
    dock/
      ResultCardDock.tsx
      ProductDockCard.tsx
    cards/
      ListingCopyCard.tsx
      ErrorReportCard.tsx
  features/
    useCommerceAgent.ts
    CommerceSidepanelShell.tsx
```

## Touch Surface for Phase 1

Prefer limiting real modifications to:

- `packages/extension/src/entrypoints/sidepanel/App.tsx`
- new `packages/extension/src/commerce/**`
- possibly a new `useCommerceAgent` hook or feature facade

Avoid first-phase changes in:

- `packages/core/src/PageAgentCore.ts`
- `packages/ui/src/panel/**`
- root workspace layout
- publish/build scripts

## Delivery Plan

### Phase 0: Architecture Baseline

- Finalize this document.
- Create the commerce folder skeleton.
- Define domain contracts.

### Phase 1: Thin Integration

- Add a Dock slot to the side panel layout.
- Add a result card store and active card state.
- Route mock result envelopes through the new layers.
- Keep the current process history UI intact.

Success condition:

- The extension can render a compact active result card without disturbing the
  existing agent process flow.

### Phase 2: Real Product Capture

- Implement Amazon product extraction.
- Return a real `product` card.
- Persist the result card locally.

### Phase 3: Listing Copy

- Implement `optimizeActiveProduct`.
- Create `listing_copy` cards from the active product card.

### Phase 4: Decide on Package Extraction

Only consider new workspace packages when:

- domain contracts are stable
- application/runtime seams are proven
- UI contracts stop changing weekly
- reuse outside the extension becomes real

## Risks

### Duplicate state between process flow and result flow

Mitigation:

- Keep stream responsibilities separate.
- Do not auto-convert history items into result cards.

### Dock bloat

Mitigation:

- Force Dock to read summary only.
- Limit the product summary to image, title, price, category.

### App-level orchestration becoming a dumping ground

Mitigation:

- Put wiring in `features`.
- Keep page-specific and storage-specific logic in runtime adapters.

### Amazon extractor fragility

Mitigation:

- Use extractor strategy boundaries.
- Return recoverable business errors when necessary.

## Decision Summary

V2 chooses low intrusion over early package purity.

That means:

- keep the current extension host
- add soft layers first
- separate process stream from result stream
- keep the Dock compact
- postpone package extraction until the architecture proves itself
