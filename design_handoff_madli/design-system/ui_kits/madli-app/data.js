const NS = window.MadliDesignSystem_b70beb;

// Three picks per scope. Reasons are the product; every pick carries one.
window.MADLI_DATA = {
  city: "Istanbul",
  area: "Kadıköy",
  updated: "updated 2h ago",
  scopes: [
    { value: "eat", label: "Eat" },
    { value: "do", label: "Do" },
    { value: "stay", label: "Stay" },
  ],
  picks: {
    eat: [
      {
        rank: 1, name: "Çiya Sofrası", category: "Anatolian", neighborhood: "Kadıköy", priceLevel: "₺₺",
        reason: "Locals rank it first for a sit-down lunch: the stews change daily and nothing is over 200₺.",
        gapTone: "clear", gapPoints: 11, locals: 412, visitors: 88,
        address: "Güneşli Bahçe Sk. 43", walk: "6 min walk", open: "Open till 22:00",
        method: "500 local ratings, weighted by how often each person eats in this area. Visitor ratings count for a fifth as much.",
        gem: false,
      },
      {
        rank: 2, name: "Kadıköy Fish Market", category: "Seafood · counters", neighborhood: "Kadıköy", priceLevel: "₺₺",
        reason: "Best if you want to stand and eat: the two counters at the far end turn over fastest, so nothing sits.",
        gapTone: "close", gapNote: "3 pts behind #1 — either works", locals: 298, visitors: 210,
        address: "Serasker Cd.", walk: "9 min walk", open: "Open till 20:00",
        method: "508 ratings across 14 stalls. We rank the market as one place because locals do.",
        gem: false,
      },
      {
        rank: 3, name: "Bal Kaymak Hüseyin", category: "Breakfast", neighborhood: "Yeldeğirmeni", priceLevel: "₺",
        reason: "Nine tables, no sign, and 84% of the people rating it live within a kilometre.",
        gapTone: "thin", gapNote: "Only 61 ratings — treat as a hint", locals: 61, visitors: 4,
        address: "Karakolhane Cd. 22", walk: "14 min walk", open: "Closes 13:00",
        method: "61 local ratings. Below our 100-rating threshold, so we show it as a hint, not a verdict.",
        gem: true,
      },
    ],
    do: [
      {
        rank: 1, name: "Moda Coastline Walk", category: "Walk · 40 min", neighborhood: "Moda", priceLevel: "Free",
        reason: "The one thing almost every local recommends to a visitor with a spare evening. Go west, not east.",
        gapTone: "clear", gapPoints: 19, locals: 640, visitors: 302,
        address: "Moda Sahil", walk: "12 min walk", open: "Best 18:00–20:30",
        method: "942 ratings. Weighted toward people who have rated 5+ places in Kadıköy.", gem: false,
      },
      {
        rank: 2, name: "Yeldeğirmeni murals", category: "Street art", neighborhood: "Yeldeğirmeni", priceLevel: "Free",
        reason: "Six blocks, about 25 minutes. Locals rate it higher on weekday mornings when the streets are empty.",
        gapTone: "close", gapNote: "Nearly tied with #1 in summer", locals: 188, visitors: 401,
        address: "Macit Erbudak Sk.", walk: "8 min walk", open: "Anytime",
        method: "589 ratings. Visitors rate this higher than locals — we show both.", gem: false,
      },
      {
        rank: 3, name: "Barış Manço Museum", category: "Museum", neighborhood: "Moda", priceLevel: "₺",
        reason: "Small and specific. Worth it if you already know the music; skip it if you do not.",
        gapTone: "thin", gapNote: "Divides opinion — 41% rate it top, 30% rate it low", locals: 132, visitors: 96,
        address: "Değirmen Sk. 4", walk: "11 min walk", open: "Closed Mondays",
        method: "228 ratings with an unusually wide spread, so we say so instead of averaging it away.", gem: false,
      },
    ],
    stay: [
      {
        rank: 1, name: "Hush Moda", category: "Guesthouse · 14 rooms", neighborhood: "Moda", priceLevel: "₺₺",
        reason: "Quietest of the three and the only one where locals send their own visiting family.",
        gapTone: "clear", gapPoints: 8, locals: 96, visitors: 344,
        address: "Bademaltı Sk. 6", walk: "10 min walk", open: "Check-in 14:00",
        method: "440 ratings. Local weight is lower here — few locals sleep in their own city.", gem: false,
      },
      {
        rank: 2, name: "Kadıköy Rooms", category: "Apartments", neighborhood: "Kadıköy", priceLevel: "₺₺",
        reason: "Closest to the ferry, which matters more than anything else if you are here for two nights.",
        gapTone: "close", gapNote: "2 pts behind #1", locals: 40, visitors: 512,
        address: "Serasker Cd. 71", walk: "3 min walk", open: "Self check-in",
        method: "552 ratings, mostly visitors. We flag that the local sample is thin.", gem: false,
      },
      {
        rank: 3, name: "Villa Yeldeğirmeni", category: "Guesthouse · 6 rooms", neighborhood: "Yeldeğirmeni", priceLevel: "₺",
        reason: "Cheapest of the three and the walls are thin. Fine for one night, not for four.",
        gapTone: "thin", gapNote: "Only 38 ratings", locals: 12, visitors: 26,
        address: "Rıhtım Cd. 9", walk: "15 min walk", open: "Check-in 15:00",
        method: "38 ratings. Shown because there is nothing else in this price band nearby.", gem: false,
      },
    ],
  },
  saved: [
    { name: "Çiya Sofrası", area: "Kadıköy", note: "Saved for Thursday lunch" },
    { name: "Moda Coastline Walk", area: "Moda", note: "Saved 3 days ago" },
    { name: "Bal Kaymak Hüseyin", area: "Yeldeğirmeni", note: "Saved 1 week ago" },
  ],
};
