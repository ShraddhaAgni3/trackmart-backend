import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, text }) => {

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // important
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
    connectionTimeout: 10000, // 10 sec
  });

  await transporter.sendMail({
    from: process.env.EMAIL,
    to,
    subject,
    text,
  });
};
