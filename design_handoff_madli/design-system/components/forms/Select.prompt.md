Use for short closed lists (party size, time window). Long or searchable lists use `SearchField`.

```jsx
<Select label="When" value={when} onChange={e => setWhen(e.target.value)} options={["Tonight","Tomorrow","This weekend"]} />
```
