const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    // Debug information
    logger: true,
    debug: true
  });
};

const sendPasswordResetEmail = async (email, resetLink) => {
  try {
    console.log(`Attempting to send email to: ${email}`);
    console.log(`Reset link: ${resetLink}`);

    // Validate email format
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    const transporter = createTransporter();

    // Verify connection configuration
    await transporter.verify();
    console.log('SMTP connection verified successfully');

    const mailOptions = {
      from: `ShopStyle <${process.env.EMAIL}>`,  // Fixed template literal
      to: email,
      subject: 'ShopStyle - Password Reset Request',
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Password Reset Request</h2>
              <p>You requested to reset your password for your ShopStyle account.</p>
              <p>Click the button below to reset your password:</p>
              <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" 
                     style="background-color: #007bff; color: white; padding: 12px 24px; 
                            text-decoration: none; border-radius: 4px; display: inline-block;">
                      Reset Your Password
                  </a>
              </div>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #007bff;">${resetLink}</p>
              <p>This link will expire in 1 hour.</p>
              <p>If you didn't request this, please ignore this email.</p>
              <hr>
              <p style="color: #666; font-size: 12px;">
                  ShopStyle Team<br>
                  Thank you for choosing us!
              </p>
          </div>`
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully');
    console.log('📧 Message ID:', result.messageId);
    console.log('👤 Recipient:', email);
    
    return {
      success: true,
      messageId: result.messageId,
      response: result.response
    };
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    
    // More specific error messages
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Check your email credentials.');
      console.error('Make sure you are using an App Password, not your regular Gmail password.');
    } else if (error.code === 'ECONNECTION') {
      console.error('Connection failed. Check your network or SMTP settings.');
    } else if (error.code === 'EENVELOPE') {
      console.error('Invalid envelope. Check the "to" email address.');
    }
    
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = { sendPasswordResetEmail };