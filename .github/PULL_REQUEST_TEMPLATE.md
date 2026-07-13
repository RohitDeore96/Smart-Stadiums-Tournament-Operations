## Summary

<!-- One paragraph: what does this PR do and why? -->

## Linked issue

<!-- Closes #123 -->

## Pillar checklist

<!-- Tick every box. If a box doesn't apply, explain why in the section below. -->

- [ ] **Code Quality** — TS strict, no `any`, files ≤ 300 LOC, DRY (shared types used)
- [ ] **Security** — inputs Zod-validated, no secrets in code, prompt-injection defense intact
- [ ] **Efficiency** — no N+1 Firestore reads, paginated lists, no sync I/O on hot path
- [ ] **Testing** — unit tests added for new logic, integration tests for new routes, ≥ 80% coverage
- [ ] **Accessibility** — semantic HTML, ARIA labels, keyboard nav, axe tests pass

## Verification

<!-- What commands did you run to verify this works? -->

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Screenshots / recordings

<!-- For UI changes only. Show before/after. -->

## Notes for reviewer

<!-- Anything non-obvious? Anything you want explicit feedback on? -->

## Out of scope

<!-- What did you intentionally NOT do in this PR? -->
