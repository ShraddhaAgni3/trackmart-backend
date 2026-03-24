import pool from "../config/db.js";
export const getVendorOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    /* vendor id */
    const vendor = await pool.query(
      "SELECT id FROM vendors WHERE user_id=$1",
      [userId]
    );

    if (!vendor.rows.length) {
      return res.status(400).json({ message: "Vendor not found" });
    }

    const vendorId = vendor.rows[0].id;

    /* order + customer + address */
    const order = await pool.query(
      `
      SELECT 
        o.*,
        u.name AS customer_name,
        u.phone,
        a.*
      FROM orders o
      JOIN users u ON u.id = o.user_id
      JOIN addresses a ON a.id = o.address_id
      WHERE o.id = $1
      `,
      [id]
    );

    if (!order.rows.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    /* only this vendor items */
    const items = await pool.query(
      `
      SELECT 
        oi.*,
        p.title
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1 AND oi.vendor_id = $2
      `,
      [id, vendorId]
    );

    res.json({
      order: order.rows[0],
      items: items.rows
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};
export const createOrder = async (req, res) => {
  try {

    const { payment_method, address_id } = req.body;
    const userId = req.user.id;

    const cart = await pool.query(
      `SELECT c.*, p.price, p.vendor_id, p.title
       FROM carts c
       JOIN products p ON p.id=c.product_id
       WHERE c.user_id=$1`,
      [userId]
    );

    if (!cart.rows.length) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let total = 0;

    for (let item of cart.rows) {
      const productTotal =
        Number(item.price) * Number(item.quantity);

     

      total += productTotal ;
    }

    const order = await pool.query(
`INSERT INTO orders
(user_id,total_amount,payment_method,payment_status,order_status,address_id)
VALUES($1,$2,$3,$4,$5,$6)
RETURNING *`,
[
userId,
total,
payment_method,
"pending",
"placed",
address_id
]
);

    const orderId = order.rows[0].id;

    for (let item of cart.rows) {

      const productTotal =
        Number(item.price) * Number(item.quantity);

     

      const commission =
        productTotal * 0.10;

      const earning =
        (productTotal - commission);

      await pool.query(
        `INSERT INTO order_items
        (order_id,product_id,vendor_id,price_at_purchase,quantity,
         commission_amount,vendor_earning,payout_status)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          orderId,
          item.product_id,
          item.vendor_id,
          item.price,
          item.quantity,
          commission,
          earning,
          "pending"
        ]
      );

      /* ================= NOTIFICATION FOR VENDOR ================= */

      const vendorUser = await pool.query(
        `
        SELECT u.id
        FROM vendors v
        JOIN users u ON v.user_id = u.id
        WHERE v.id = $1
        `,
        [item.vendor_id]
      );

      if (vendorUser.rows.length) {

        const vendorUserId = vendorUser.rows[0].id;

        await pool.query(
          `
          INSERT INTO notifications
          (user_id,title,message,type)
          VALUES($1,$2,$3,$4)
          `,
          [
            vendorUserId,
            "New Order Received",
            `You received a new order for product: ${item.title}`,
            "order"
          ]
        );

      }

    }

    await pool.query(
      "DELETE FROM carts WHERE user_id=$1",
      [userId]
    );

    res.json({ message:"Order placed successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};



export const getUserOrders = async (req, res) => {
  try {

    const userId = req.user.id;

    const orders = await pool.query(
      `SELECT *
       FROM orders
       WHERE user_id=$1
       ORDER BY created_at DESC`,
      [userId]
    );

    const result = [];

    for (const order of orders.rows) {

      const items = await pool.query(
        `SELECT 
          oi.*,
          p.title AS product_title,
          p.health_rating
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = $1`,
        [order.id]
      );

      result.push({
        ...order,
        items: items.rows
      });
    }

    res.json(result);

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};
