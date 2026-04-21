const nodemailer = require('nodemailer');

const sendOTP = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Event Hub Verification OTP',
            text: `Your verification code is: ${otp}. It will expire in 10 minutes.`,
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h2>Event Hub Email Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #4f46e5; letter-spacing: 5px;">${otp}</h1>
          <p>It will expire in 10 minutes.</p>
        </div>
      `,
        };

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail(mailOptions);
            console.log(`OTP sent successfully to ${email}`);
        } else {
            console.warn('EMAIL_USER and EMAIL_PASS not found in .env. Logging OTP directly instead of sending email.');
            console.log(`[SIMULATED EMAIL TO ${email}] Your OTP is: ${otp}`);
        }
        return true;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        return false;
    }
};

const sendMerchantCredentials = async (email, password) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Event Hub Merchant Credentials',
            text: `You have been registered as a merchant on Event Hub.\nEmail: ${email}\nPassword: ${password}\nPlease change your password after logging in.`,
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h2>Welcome to Event Hub, Merchant!</h2>
          <p>You have been registered by the admin. Here are your login credentials:</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
          <p><em>Please change your password after logging in.</em></p>
        </div>
      `,
        };

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail(mailOptions);
            console.log(`Credentials sent successfully to ${email}`);
        } else {
            console.warn('EMAIL_USER and EMAIL_PASS not found in .env. Logging credentials directly instead of sending email.');
            console.log(`[SIMULATED EMAIL TO ${email}] Password: ${password}`);
        }
        return true;
    } catch (error) {
        console.error('Error sending credentials email:', error);
        return false;
    }
};

const sendMerchantInvite = async (email, token) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const setupLink = `http://localhost:5173/merchant-setup?token=${token}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Complete Your Event Hub Merchant Registration',
            text: `Welcome to Event Hub! Click the link to set up your account: ${setupLink}`,
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h2>Welcome to Event Hub!</h2>
          <p>You have been invited to join as a merchant. Click the button below to set up your account and create a password.</p>
          <a href="${setupLink}" style="background-color: #4f46e5; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">Set Up Your Account</a>
          <p style="margin-top: 20px;">This link will expire in 24 hours.</p>
        </div>
      `,
        };

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail(mailOptions);
            console.log(`Invitation sent successfully to ${email}`);
        } else {
            console.warn('EMAIL_USER and EMAIL_PASS not found in .env. Logging invite link directly instead of sending email.');
            console.log(`[SIMULATED EMAIL TO ${email}] Setup link: ${setupLink}`);
        }
        return true;
    } catch (error) {
        console.error('Error sending invitation email:', error);
        return false;
    }
};

module.exports = { sendOTP, sendMerchantCredentials, sendMerchantInvite };
