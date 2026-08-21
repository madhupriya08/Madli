// Mirrors Phase 1's `categories` table exactly (same ids as supabase/seed.sql)
// so fixtures and the real backend agree on identifiers.
export interface Category {
  id: string;
  name: string;
}

export const categories: Category[] = [
  { id: '00000000-0000-0000-0000-0000000000c1', name: 'Breakfast and tiffin' },
  { id: '00000000-0000-0000-0000-0000000000c2', name: 'Biryani and kebab' },
  { id: '00000000-0000-0000-0000-0000000000c3', name: 'Cafes' },
  { id: '00000000-0000-0000-0000-0000000000c4', name: 'Lakes and viewpoints' },
  { id: '00000000-0000-0000-0000-0000000000c5', name: 'Historical' },
  { id: '00000000-0000-0000-0000-0000000000c6', name: 'Nightlife' },
  { id: '00000000-0000-0000-0000-0000000000c7', name: 'Concerts and events' },
];

export function categoryName(id: string): string {
  return categories.find((c) => c.id === id)?.name ?? 'Uncategorized';
}
