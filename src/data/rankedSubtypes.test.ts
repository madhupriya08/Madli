import { describe, it, expect } from 'vitest';
import { subtypeFor } from './rankedSubtypes';

describe('subtypeFor — P13 §7 category grouping', () => {
  it('falls back to Restaurants on the Eat door when nothing more specific matches', () => {
    expect(subtypeFor('eat', ['restaurant', 'point_of_interest']).label).toBe('Restaurants');
  });

  it('recognises a cafe as its own bucket, not a plain restaurant', () => {
    expect(subtypeFor('eat', ['cafe', 'food']).label).toBe('Cafes');
  });

  it('groups a bar or night_club as "Bars & pubs" on the Eat door', () => {
    expect(subtypeFor('eat', ['bar']).label).toBe('Bars & pubs');
    expect(subtypeFor('eat', ['night_club']).label).toBe('Bars & pubs');
  });

  it('recognises a bakery', () => {
    expect(subtypeFor('eat', ['bakery', 'food']).label).toBe('Bakeries');
  });

  it('falls back to Landmarks & sights on the Explore door', () => {
    expect(subtypeFor('explore', ['tourist_attraction']).label).toBe('Landmarks & sights');
  });

  it('recognises a temple or other place of worship', () => {
    expect(subtypeFor('explore', ['hindu_temple', 'place_of_worship']).label).toBe(
      'Temples & worship',
    );
  });

  it('recognises a museum or art gallery', () => {
    expect(subtypeFor('explore', ['museum']).label).toBe('Museums & galleries');
    expect(subtypeFor('explore', ['art_gallery']).label).toBe('Museums & galleries');
  });

  it('recognises a park', () => {
    expect(subtypeFor('explore', ['park']).label).toBe('Parks & lakes');
  });

  it('recognises a concert/performance venue', () => {
    expect(subtypeFor('explore', ['performing_arts_theater']).label).toBe('Concerts & shows');
  });

  it('recognises nightlife on the Explore door', () => {
    expect(subtypeFor('explore', ['night_club']).label).toBe('Nightlife');
  });

  it('the same type vocabulary means different things on different doors', () => {
    // 'bar'/'night_club' reads as "Bars & pubs" behind Eat, "Nightlife" behind Explore.
    expect(subtypeFor('eat', ['bar']).label).toBe('Bars & pubs');
    expect(subtypeFor('explore', ['bar']).label).toBe('Nightlife');
  });
});
