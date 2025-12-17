const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: "ella42@ethereal.email",
    pass: "Nk97uU5KaJRxvGRW47",
  },
});

// Email sending function

const sendPasswordResetEmail = async (email, resetLink) => {
    try{
        console.log(email);
        console.log(resetLink);

        const mailOptions = {
            from: '"ShopStyle" <ella42@ethereal.email>',
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
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions)
        console.log("Mail send successfully");
        console.log('Password reset mail sent to:', email);
        console.log('Preview URL:', nodemailer.getTestMessageUrl(result));
        return result;
    }catch(error){
        console.error('Error sending mail', error);
        logger.error('Error sending mail', error);
        throw new error('Failed to send Email' + error.message);
    }
};

module.exports = { sendPasswordResetEmail };