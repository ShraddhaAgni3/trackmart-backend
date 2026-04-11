import pool from "../config/db.js";

export const getItemTracking = async (req, res) => {
  try {
    const { itemId } = req.params;

    // ✅ validation
    if (!itemId) {
      return res.status(400).json({ message: "Item ID required" });
    }

    const result = await pool.query(
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

    // ❌ not found
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    const data = result.rows[0];

    // 🔐 ACCESS CONTROL
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // user access
    if (user.role === "user" && data.user_id !== user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // vendor access
    if (user.role === "vendor" && data.vendor_id !== user.vendor_id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // ✅ clean response
    return res.json({
      item_id: data.item_id,
      status: data.item_status,
      delivery_date: data.delivery_date,
      vendor_name: data.vendor_name,
      title: data.title
    });

  } catch (err) {
    console.error("TRACK ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};
