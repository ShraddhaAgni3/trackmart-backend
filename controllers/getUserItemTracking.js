import pool from "../config/db.js";
export const getUserItemTracking = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await pool.query(
      `
      SELECT 
        oi.id,
        oi.item_status,
        oi.delivery_date,
        oi.vendor_id,
        p.title,
        v.name AS vendor_name
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN vendors v ON v.id = oi.vendor_id
      WHERE oi.id = $1
      `,
      [itemId]
    );

    if (!item.rows.length) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(item.rows[0]);

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};
