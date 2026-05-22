# Coding Rules

## Common Rules

- **Single Responsibility**: Each function, class, or module has exactly one clear responsibility.
- **Self-Documenting Names**: Names reveal intent without needing comments.
- **Early Return**: Handle edge cases first and return early; keep main logic flat.
- **DRY**: Extract shared logic appearing more than twice into a reusable abstraction.
- **Validate at Boundaries**: Strictly validate at system boundaries; trust internal input.
- **Minimize Public Surface**: Expose only necessary public interfaces; hide implementation.
- **Actionable Errors**: Error messages include enough context to identify and fix the issue.
- **Testable Changes**: Avoid global state and implicit dependencies for easy unit testing.
- **Progressive Complexity**: Implement the simplest thing that works; add complexity only when proven necessary.
- **Consistency**: Match the surrounding codebase in style, structure, and patterns.
- **Default to Invariants**: Prefer solutions that establish the strongest always-true conditions to reduce reasoning burden and prevent bugs.

## Reference Docs

*Only Read the docs you need depends on your task type*

javascript coding style: docs/coding_style/coding_style_js.md
react coding style: docs/coding_style/coding_style_react.md