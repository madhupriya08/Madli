The core Madli unit. Composes PhotoFrame, RankBadge, ReasonNote, RankGap and SampleSize; render exactly three per result set.

```jsx
<PickCard rank={1} name="Çiya Sofrası" category="Anatolian" neighborhood="Kadıköy" priceLevel="₺₺"
  reason="Locals rank it first for a sit-down lunch: the daily stews change and nothing is over 200₺."
  gapTone="clear" gapPoints={11} locals={412} visitors={88} />
```

`layout="horizontal"` for desktop lists and saved items; `vertical` for the phone. `gem` swaps the reason label and rail to coral.
