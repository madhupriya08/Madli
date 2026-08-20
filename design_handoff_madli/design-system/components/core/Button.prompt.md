Use for any action; Madli allows exactly one `accent` (Coral) button per view and uses `primary` (Deep Teal) everywhere else.

```jsx
<Button variant="primary" size="md" iconLeft={<Icon name="navigation" size={17} />}>Get 3 picks</Button>
<Button variant="secondary">Change city</Button>
<Button variant="ghost" size="sm">Skip</Button>
```

Sizes are 36 / 44 / 52px tall. `block` fills the container (used for the phone's primary action). Press state settles 1px down, no scale bounce.
