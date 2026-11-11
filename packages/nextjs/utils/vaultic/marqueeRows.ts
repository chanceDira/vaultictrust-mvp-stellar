const MIN_MARQUEE_ITEMS = 12;

export type MarqueeRow<T> = {
  key: string;
  item: T;
  copy: number;
};

export function marqueeRows<T>(items: T[], keyOf: (item: T) => string): MarqueeRow<T>[] {
  if (items.length === 0) return [];
  const copies = Math.max(2, Math.ceil(MIN_MARQUEE_ITEMS / items.length));
  const rows: MarqueeRow<T>[] = [];
  for (let copy = 0; copy < copies; copy += 1) {
    for (const item of items) {
      rows.push({ key: `${copy}-${keyOf(item)}`, item, copy });
    }
  }
  return rows;
}
