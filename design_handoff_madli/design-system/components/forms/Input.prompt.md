Standard 44px field, 10px radius, teal focus ring.

```jsx
<Input label="City" iconLeft="map-pin" value={city} onChange={e => setCity(e.target.value)} hint="Ranked in 34 cities so far" />
```

Pass `error` to swap the hint for a red message and the border to red.
