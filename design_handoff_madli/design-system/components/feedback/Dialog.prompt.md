One component, two presentations. Positioned `absolute` so it can be scoped to a phone frame.

```jsx
<Dialog variant="sheet" title="How this was ranked" onClose={close}>…</Dialog>
```

Sheets get a 28px top radius and a grab handle; modals get a close button.
