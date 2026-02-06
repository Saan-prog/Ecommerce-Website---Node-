const { Resend } = require("resend");

require('dotenv').config();
const resend = new Resend(process.env.RESEND_API_KEY);

const sendPasswordResetEmail = async (email, resetLink) => {
  try {
    console.log(`Sending password reset email to: ${email}`);
    console.log(`Reset link: ${resetLink}`);

    const { data, error } = await resend.emails.send({
      from: "ShopStyle <onboarding@resend.dev>",
      to: email,
      subject: "ShopStyle - Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin-bottom: 10px;">ShopStyle</h1>
            <p style="color: #7f8c8d; font-size: 16px;">Your Fashion Destination</p>
          </div>
          
          <h2 style="color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">Password Reset Request</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            You requested to reset your password for your ShopStyle account.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Click the button below to reset your password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); 
                      color: white; padding: 14px 32px; text-decoration: none; 
                      border-radius: 4px; display: inline-block; font-size: 16px;
                      font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(44, 62, 80, 0.2);
                      transition: all 0.3s ease;">
              Reset Your Password
            </a>
          </div>
          
          <p style="font-size: 14px; color: #777; text-align: center; margin: 20px 0;">
            Or copy and paste this link in your browser:
          </p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; word-break: break-all;">
            <code style="color: #2c3e50; font-size: 14px;">${resetLink}</code>
          </div>
          
          <div style="background: #fff8e1; border-left: 4px solid #ffb300; padding: 15px; margin: 25px 0; border-radius: 0 4px 4px 0;">
            <p style="margin: 0; color: #5d4037; font-size: 14px;">
              <strong>⚠️ Important:</strong> This link will expire in 1 hour.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #666; margin: 20px 0;">
            If you didn't request a password reset, please ignore this email or 
            <a href="mailto:support@shopstyle.com" style="color: #2c3e50; text-decoration: none;">
              contact our support team
            </a> if you have any concerns.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          
          <div style="text-align: center; color: #95a5a6; font-size: 12px;">
            <p style="margin: 5px 0;">
              © ${new Date().getFullYear()} ShopStyle. All rights reserved.
            </p>
            <p style="margin: 5px 0;">
              123 Business Street, New York, NY 10001
            </p>
            <p style="margin: 5px 0;">
              <a href="https://shopstyle.com" style="color: #95a5a6; text-decoration: none;">shopstyle.com</a> | 
              <a href="mailto:support@shopstyle.com" style="color: #95a5a6; text-decoration: none;">support@shopstyle.com</a>
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending email with Resend:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('Password reset email sent successfully via Resend');
    console.log('Email ID:', data?.id);
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in sendPasswordResetEmail:', error);
    throw new Error('Failed to send password reset email: ' + error.message);
  }
};

module.exports = { sendPasswordResetEmail };