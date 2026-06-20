# Deferred Work

## Deferred from: code review of 1-0-ui-contract-signature-cell (2026-06-20)

- `sprint-status.yaml` `last_updated` field uses freeform date+notes string instead of a parseable date scalar — pre-existing convention established before this story; no downstream tooling currently parses it as a typed date
- `CipherCell` `revealing` state renders identically to `masked` with only `aria-busy=true` distinction; no visual progress indicator — instantaneous-swap transition is specified for 1.0; real revealing visual treatment (e.g. spinner or progress ring) comes with async crypto in Stories 2.3/4.1
- `DataTable` empty `columns` array renders an empty `<thead>` with no accessible column scope — stub frame only; real column validation comes with data binding in later stories
- `RoleSwitcher` `defaultRole` prop changes after mount are silently ignored (uncontrolled `useState` pattern) — fixture-only stub; no external controlled switching needed until lens routing is wired in later stories
- `tokens.ts` `roleAccent()` called with a non-typed string from JS interop returns undefined CSS vars (`var(--role-undefined)`) — TypeScript union prevents this at compile time; no JS interop exists in this story's scope
- `AuditLogRow` `chained=true` with undefined `children` renders a row with only the chain-marker glyph and no content text — stub frame; fixture always provides children; real validation comes with audit-log data binding in Story 2.2
