# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sync-indicator.spec.js >> Indicatore stato sincronizzazione >> Mostra "Conflitto" se ci sono conflitti
- Location: tests/e2e/sync-indicator.spec.js:28:5

# Error details

```
Error: Channel closed
```

```
Error: page.getAttribute: Target page, context or browser has been closed
Call log:
  - waiting for locator('.sync-indicator')

```

```
Error: browserContext.close: Target page, context or browser has been closed
```