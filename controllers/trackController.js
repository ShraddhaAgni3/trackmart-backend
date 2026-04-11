import pool from "../config/db.js";
export const getItemTracking = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await pool.query(
      `
      SELECT 
       oi.id AS item_id,
        oi.item_status,
        oi.delivery_date,
        oi.vendor_id,
        o.user_id,
        p.title,
        v.business_name AS vendor_name
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      JOIN vendors v ON v.id = oi.vendor_id
      WHERE oi.id = $1
      `,
      [itemId]
    );

    if (!item.rows.length) {
      return res.status(404).json({ message: "Item not found" });
    }

    const data = item.rows[0];

    /* 🔐 ACCESS CONTROL */

    const user = req.user;

    if (user.role === "user" && data.user_id !== user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (user.role === "vendor" && data.vendor_id !== user.vendor_id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // admin → full access

    res.json(data);

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};
