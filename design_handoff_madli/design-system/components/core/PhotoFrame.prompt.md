Every photo in Madli goes through PhotoFrame so ratio, radius and the text-protection scrim stay consistent.

```jsx
<PhotoFrame src={hero} label="Kadıköy fish market" ratio="16 / 10" overlay>
  <div style={{position:"absolute",bottom:16,left:16,color:"var(--white)"}}>Kadıköy</div>
</PhotoFrame>
```

With no `src` it renders a quiet cream placeholder naming what belongs there — use that rather than stock art.
