// controllers/profileController.js

/* ================= GET PROFILE ================= */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await req.db.query(
      `SELECT 
        id,
        name,
        email,
        role,
        business_name,
        phone,
        shop_address,
        upi_id
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ ROLE BASED RESPONSE
    if (user.role === "vendor") {
      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        business_name: user.business_name,
        phone: user.phone,
        shop_address: user.shop_address,
        upi_id: user.upi_id
      });
    }

    // 👤 CUSTOMER RESPONSE
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};


/* ================= UPDATE PROFILE ================= */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // 👉 vendor ke fields
    const {
      business_name,
      phone,
      shop_address,
      upi_id
    } = req.body;

    if (role === "vendor") {

      await req.db.query(
        `UPDATE users
         SET business_name=$1,
             phone=$2,
             shop_address=$3,
             upi_id=$4
         WHERE id=$5`,
        [business_name, phone, shop_address, upi_id, userId]
      );

      return res.json({ message: "Vendor profile updated" });
    }

    // 👤 CUSTOMER → nothing to update (address alag table me hai)
    return res.json({ message: "Nothing to update for customer" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Update failed" });
  }
};
