Loading should feel quick and quiet. Use `PickSkeleton` so the layout does not move when the real picks arrive.

```jsx
{loading ? <PickSkeleton /> : <PickCard {...pick} />}
```

Never add spinners, progress percentages, or "finding the best spots…" copy — the promise is two minutes, so nothing should look like it is stalling.
