// controllers/paymentController.js

import Razorpay from "razorpay";
import crypto from "crypto";
import pool from "../config/db.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/* ================= CUSTOMER ================= */

/* CREATE ORDER */
export const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });

    res.json({ success: true, order });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* VERIFY PAYMENT */
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      return res.json({ success: true });
    }

    return res.status(400).json({ success: false });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};




/* ================= VENDOR ================= */

/* CREATE VENDOR ORDER */
export const createVendorOrder = async (req, res) => {
  try {
    const { vendorId } = req.body;

    const result = await pool.query(
      `SELECT COALESCE(SUM(vendor_earning),0) AS total
       FROM order_items
       WHERE vendor_id=$1
       AND payout_status='pending'
       AND item_status='delivered'`,
      [vendorId]
    );

    const amount = Number(result.rows[0].total);

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "No pending payout"
      });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `vendor_${vendorId}_${Date.now()}`,
      notes: {
        type: "vendor",
        vendorId
      }
    });

    res.json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};



/* VERIFY VENDOR PAYMENT */
export const verifyVendorPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      vendorId
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature"
      });
    }

    // ✅ mark payout paid
    await pool.query(
      `UPDATE order_items
       SET payout_status='paid'
       WHERE vendor_id=$1
       AND payout_status='pending'
       AND item_status='delivered'`,
      [vendorId]
    );

    // ✅ log
    await pool.query(
      `INSERT INTO payouts (vendor_id, payment_id, created_at)
       VALUES ($1,$2,NOW())`,
      [vendorId, razorpay_payment_id]
    );

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};
