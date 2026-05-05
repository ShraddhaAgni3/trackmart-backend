import pool from "../config/db.js";
import xlsx from "xlsx";

/* ================= COMMON INSERT FUNCTION ================= */

const createProduct = async (data, vendor_id) => {

  const {
    title,
    description,
    price,
    stock,
    size,
    category_id,
    calories,
    sugar,
    fat,
    protein,
    care_type,
    concern_type,
    ingredients,
    how_to_use,
    making_process,
    image_url,
    ingredients_image_url
  } = data;

  if (!title || !price || !stock || !size) {
    throw new Error("Missing required fields");
  }

  // duplicate check
  const existing = await pool.query(
    `SELECT id FROM products 
     WHERE vendor_id=$1 
     AND LOWER(title)=LOWER($2)
     AND status='active'`,
    [vendor_id, title]
  );

  if (existing.rows.length > 0) {
    throw new Error("Duplicate product");
  }

  // health rating
  let health_rating = "Healthy";
  if (
    (sugar && sugar > 20) ||
    (fat && fat > 20) ||
    (calories && calories > 500)
  ) {
    health_rating = "Unhealthy";
  }

  const product = await pool.query(
    `
    INSERT INTO products
    (vendor_id,category_id,title,description,
    price,stock,size,
    calories,sugar,fat,protein,
    care_type,concern_type,
    ingredients,health_rating,
    how_to_use,making_process,
    image_url,ingredients_image_url)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
    $11,$12,$13,$14,$15,$16,$17,$18,$19)
    RETURNING *
    `,
    [
      vendor_id,
      category_id,
      title,
      description,
      Number(price),
      Number(stock),
      size,
      calories || null,
      sugar || null,
      fat || null,
      protein || null,
      care_type,
      concern_type,
      ingredients,
      health_rating,
      how_to_use || null,
      making_process || null,
      image_url || null,
      ingredients_image_url || null
    ]
  );

  return product.rows[0];
};

/* ================= GET PRODUCT BY ID ================= */

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await pool.query(
      `
      SELECT 
        p.*,
        c.name AS category_name,
        c.benefits,
        v.business_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN vendors v ON p.vendor_id = v.id
      WHERE p.id = $1 AND p.status='active'
      `,
      [id]
    );

    if (product.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product.rows[0]);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= GET PRODUCTS ================= */

export const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      care,
      concern,
      price,
      sort,
      page = 1,
      limit = 8
    } = req.query;

    const offset = (page - 1) * limit;

    let baseQuery = `
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN vendors v ON p.vendor_id = v.id
      WHERE p.status='active'
    `;

    let values = [];
    let index = 1;

    if (search) {
      baseQuery += `
        AND (
          p.title ILIKE $${index}
          OR p.description ILIKE $${index}
          OR p.care_type ILIKE $${index}
          OR p.concern_type ILIKE $${index}
        )
      `;
      values.push(`%${search}%`);
      index++;
    }

    if (category) {
      baseQuery += ` AND p.category_id = $${index}`;
      values.push(category);
      index++;
    }

    if (care) {
      baseQuery += ` AND p.care_type ILIKE $${index}`;
      values.push(`%${care}%`);
      index++;
    }

    if (concern) {
      baseQuery += ` AND p.concern_type ILIKE $${index}`;
      values.push(`%${concern}%`);
      index++;
    }

    if (price) {
      baseQuery += ` AND p.price <= $${index}`;
      values.push(price);
      index++;
    }

    let orderBy = `ORDER BY p.created_at DESC`;
    if (sort === "price_low") orderBy = `ORDER BY p.price ASC`;
    if (sort === "price_high") orderBy = `ORDER BY p.price DESC`;

    const productsQuery = `
      SELECT 
        p.*,
        c.name AS category_name,
        c.benefits,
        v.business_name
      ${baseQuery}
      ${orderBy}
      LIMIT $${index} OFFSET $${index + 1}
   `;

    const products = await pool.query(productsQuery, [
      ...values,
      limit,
      offset
    ]);

    const countQuery = `SELECT COUNT(*) ${baseQuery}`;
    const totalResult = await pool.query(countQuery, values);

    const total = parseInt(totalResult.rows[0].count);

    res.json({
      products: products.rows,
      totalPages: Math.ceil(total / limit)
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= CREATE PRODUCT (SAFE) ================= */

export const createProduct = async (req, res) => {
  try {

    if (req.user.role !== "vendor") {
      return res.status(403).json({ message: "Only vendors allowed" });
    }

    const vendor = await pool.query(
      "SELECT id,business_name FROM vendors WHERE user_id=$1",
      [req.user.id]
    );

    if (!vendor.rows.length) {
      return res.status(400).json({ message: "Vendor profile missing" });
    }

    const vendor_id = vendor.rows[0].id;
    const vendorName = vendor.rows[0].business_name;

    const product_image =
      req.files?.product_image?.[0]?.path || null;

    const ingredients_image =
      req.files?.ingredients_image?.[0]?.path || null;

    const product = await insertProduct({
      ...req.body,
      image_url: product_image,
      ingredients_image_url: ingredients_image
    }, vendor_id);

    // admin notification
    const admins = await pool.query(
      "SELECT id FROM users WHERE role='admin'"
    );

    for (const admin of admins.rows) {
      await pool.query(
        `INSERT INTO notifications
        (user_id,title,message,type)
        VALUES($1,$2,$3,$4)`,
        [
          admin.id,
          "New Product Added",
          `${product.title} was added by vendor ${vendorName}`,
          "product"
        ]
      );
    }

    res.json(product);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= BULK UPLOAD ================= */

export const bulkUploadProducts = async (req, res) => {
  try {

    if (req.user.role !== "vendor") {
      return res.status(403).json({ message: "Only vendors allowed" });
    }

    // 🔥 IMPORTANT CHECK
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        message: "File not received properly"
      });
    }

    const vendor = await pool.query(
      "SELECT id FROM vendors WHERE user_id=$1",
      [req.user.id]
    );

    const vendor_id = vendor.rows[0].id;

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!data.length) {
      return res.status(400).json({
        message: "Excel file is empty"
      });
    }

    let success = 0;
    let failed = [];

    for (const item of data) {
      try {
        await insertProduct({
          ...item,
          image_url: item.product_image,
          ingredients_image_url: item.ingredients_image
        }, vendor_id);

        success++;

      } catch (err) {
        failed.push({
          title: item.title,
          reason: err.message
        });
      }
    }

    res.json({
      message: "Bulk upload completed",
      success,
      failed
    });

  } catch (err) {
    console.log("BULK ERROR:", err); // 🔥 ADD THIS
    res.status(500).json({ message: err.message });
  }
};

/* ================= GET VENDOR PRODUCTS ================= */

export const getVendorProducts = async (req, res) => {
  try {

    const vendor = await pool.query(
      "SELECT id FROM vendors WHERE user_id=$1",
      [req.user.id]
    );

    const vendorId = vendor.rows[0].id;

    const products = await pool.query(
      `SELECT * FROM products
       WHERE vendor_id=$1 AND status='active'
       ORDER BY created_at DESC`,
      [vendorId]
    );

    res.json(products.rows);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= DELETE PRODUCT ================= */

export const deleteProduct = async (req, res) => {
  try {

    const { id } = req.params;

    const vendor = await pool.query(
      "SELECT id FROM vendors WHERE user_id=$1",
      [req.user.id]
    );

    const vendorId = vendor.rows[0].id;

    await pool.query(
      "UPDATE products SET status='inactive' WHERE id=$1 AND vendor_id=$2",
      [id, vendorId]
    );

    res.json({ message: "Product removed from store" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
