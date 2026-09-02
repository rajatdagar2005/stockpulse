export interface CategoryGroup {
  group: string;
  items: string[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    group: 'Food & Grocery',
    items: [
      'Dairy',
      'Bakery',
      'Snacks',
      'Fruits & Vegetables',
      'Meat & Poultry',
      'Seafood',
      'Frozen Foods',
      'Packaged Foods',
      'Cooking Ingredients',
      'Spices & Condiments',
      'Breakfast & Cereals',
      'Sweets & Confectionery',
      'Pet Food',
    ],
  },
  {
    group: 'Beverages',
    items: [
      'Beverages',
      'Tea & Coffee',
      'Juices',
      'Soft Drinks',
      'Energy Drinks',
      'Packaged Water',
    ],
  },
  {
    group: 'Electronics & Technology',
    items: [
      'Mobile Phones',
      'Mobile Accessories',
      'Computers & Laptops',
      'Computer Accessories',
      'Electronics Accessories',
      'Audio & Headphones',
      'Cameras & Accessories',
      'Networking Equipment',
      'Gaming Accessories',
      'Smart Home Devices',
    ],
  },
  {
    group: 'Clothing & Fashion',
    items: [
      'Men\'s Clothing',
      'Women\'s Clothing',
      'Kids\' Clothing',
      'Footwear',
      'Bags & Wallets',
      'Fashion Accessories',
      'Jewellery & Watches',
    ],
  },
  {
    group: 'Health & Personal Care',
    items: [
      'Personal Care',
      'Skincare',
      'Haircare',
      'Cosmetics',
      'Health & Wellness',
      'Medical Supplies',
      'Baby Care',
    ],
  },
  {
    group: 'Home & Business',
    items: [
      'Household',
      'Furniture',
      'Home Appliances',
      'Kitchen & Dining',
      'Home Decor',
      'Cleaning Supplies',
      'Hardware & Tools',
      'Office Supplies',
      'Stationery',
    ],
  },
  {
    group: 'Other Business Categories',
    items: [
      'Automotive Accessories',
      'Sports & Fitness',
      'Toys & Games',
      'Books & Media',
      'Industrial Supplies',
      'Other',
    ],
  },
];

// Flat unique list of all categories
export const ALL_CATEGORIES: string[] = Array.from(
  new Set(CATEGORY_GROUPS.flatMap((g) => g.items))
);

export function filterCategories(query: string, customCategories: string[] = []): CategoryGroup[] {
  const cleanQuery = query.toLowerCase().trim();
  const allGroups = [...CATEGORY_GROUPS];

  // Include custom categories if any exist from existing inventory that are not in standard list
  const extraItems = customCategories.filter(
    (c) => !ALL_CATEGORIES.some((std) => std.toLowerCase() === c.toLowerCase())
  );

  if (extraItems.length > 0) {
    allGroups.push({
      group: 'Custom & Existing',
      items: extraItems,
    });
  }

  if (!cleanQuery) return allGroups;

  return allGroups
    .map((grp) => ({
      group: grp.group,
      items: grp.items.filter(
        (item) =>
          item.toLowerCase().includes(cleanQuery) ||
          grp.group.toLowerCase().includes(cleanQuery)
      ),
    }))
    .filter((grp) => grp.items.length > 0);
}
