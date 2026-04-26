export interface CardRow {
  id: number;
  name: string;
  full_name: string | null;
  simple_name: string | null;
  version: string | null;
  type: string;
  color: string;
  cost: number | null;
  inkwell: number;
  strength: number | null;
  willpower: number | null;
  lore: number | null;
  move_cost: number | null;
  rarity: string | null;
  number: number | null;
  set_code: string | null;
  full_text: string | null;
  subtypes: string | null;
  subtypes_text: string | null;
  story: string | null;
  keyword_abilities: string | null;
  flavor_text: string | null;
  artists: string | null;
  image_url: string | null;
  base_id: number | null;
  enchanted_id: number | null;
  epic_id: number | null;
  iconic_id: number | null;
  reprinted_as_ids: string | null;
  reprint_of_id: number | null;
}

export interface SetRow {
  code: string;
  name: string;
  type: string | null;
  release_date: string | null;
  prerelease_date: string | null;
  card_count: number;
  /** 1 if cards are available, 0 if the set is announced but pre-release. */
  released: number;
}

export interface SearchFilters {
  query?: string;
  color?: string;
  type?: string;
  cost?: number;
  costOp?: 'eq' | 'lte' | 'gte';
  costMin?: number;
  costMax?: number;
  rarity?: string;
  setCode?: string;
  story?: string;
  inkwell?: boolean;
  hasKeyword?: string;
  limit?: number;
  offset?: number;
}
