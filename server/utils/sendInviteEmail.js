const nodemailer = require("nodemailer");

const sendInviteEmail = async (email, token) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const inviteLink = `http://localhost:5173/merchant-setup?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Merchant Invitation - EventHub",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">You are invited as a Merchant</h2>
        <p>Welcome to EventHub! You have been invited to join our platform as a merchant.</p>
        <p>Click the link below to activate your account and set up your password:</p>
        <div style="margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Activate Merchant Account</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">This link will expire in 24 hours.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 12px;">If you did not expect this invitation, please ignore this email.</p>
      </div>
    `,
  };

  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail(mailOptions);
      console.log(`Invitation email sent successfully to ${email}`);
    } else {
      console.warn("EMAIL_USER and EMAIL_PASS not found in .env. Logging invitation link instead.");
      console.log(`[SIMULATED EMAIL TO ${email}] Activation link: ${inviteLink}`);
    }
    return true;
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return false;
  }
};

module.exports = { sendInviteEmail };
