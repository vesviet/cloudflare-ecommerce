import { sql, eq } from 'drizzle-orm';
import { schema } from '@ecommerce/database';

export class CategoryService {
  /**
   * Prevents a category from being nested under its own descendant, which would create a cycle.
   */
  static async hasCycle(db: any, categoryId: string, parentId: string): Promise<boolean> {
    if (parentId === categoryId) return true;
    
    const query = sql`
      WITH RECURSIVE category_tree AS (
        SELECT id FROM categories WHERE parent_id = ${categoryId}
        UNION ALL
        SELECT c.id FROM categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
      )
      SELECT id FROM category_tree WHERE id = ${parentId};
    `;
    
    const cycleCheck = await db.run(query);
    return cycleCheck.results && cycleCheck.results.length > 0;
  }

  /**
   * Generates queries for safe deletion of a category.
   * Sets subcategories parent_id to null and removes it from products primary_category_id.
   */
  static getSafeDeletionQueries(db: any, categoryId: string) {
    return [
      db.update(schema.categories)
        .set({ parent_id: null })
        .where(eq(schema.categories.parent_id, categoryId)),
      db.update(schema.products)
        .set({ primary_category_id: null })
        .where(eq(schema.products.primary_category_id, categoryId)),
      db.delete(schema.categories).where(eq(schema.categories.id, categoryId))
    ];
  }
}
