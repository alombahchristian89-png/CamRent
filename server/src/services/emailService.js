const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send email function
const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return amount.toLocaleString('en-US');
};

const sendNewPropertyBroadcastEmail = async ({ tenants = [], property, landlordName }) => {
  const propertyTitle = escapeHtml(property?.title || 'New Property');
  const city = escapeHtml(property?.location?.city || 'Cameroon');
  const address = escapeHtml(property?.location?.address || 'See listing for details');
  const bedrooms = Number(property?.bedrooms || 0);
  const bathrooms = Number(property?.bathrooms || 0);
  const monthlyPrice = formatCurrency(property?.price);
  const landlordDisplayName = escapeHtml(landlordName || 'A verified landlord');
  const propertyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/properties/${property?._id || property?.id}`;

  const recipients = (tenants || [])
    .filter((tenant) => tenant?.email)
    .map((tenant) => ({
      email: tenant.email,
      name: tenant.name || 'Tenant'
    }));

  if (!recipients.length) {
    return { total: 0, sent: 0, failed: 0 };
  }

  const subject = `New Property Listed: ${propertyTitle} in ${city}`;
  const batchSize = 20;
  let sent = 0;
  let failed = 0;

  for (let index = 0; index < recipients.length; index += batchSize) {
    const batch = recipients.slice(index, index + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((recipient) => {
        const recipientName = escapeHtml(recipient.name);
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Property on CAMRENT</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 620px; margin: 0 auto; padding: 20px; }
              .header { background: #0B6E4F; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
              .card { background: #fff; border: 1px solid #e7ecef; border-radius: 8px; padding: 16px; margin: 14px 0; }
              .button { display: inline-block; background: #0B6E4F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 16px; }
              .meta { color: #667085; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>CAMRENT</h1>
              <p>New rental opportunity for you</p>
            </div>
            <div class="content">
              <p>Hello ${recipientName},</p>
              <p>A new property has just been listed on CAMRENT by ${landlordDisplayName}.</p>

              <div class="card">
                <h2 style="margin: 0 0 8px;">${propertyTitle}</h2>
                <p class="meta" style="margin: 0 0 8px;">${city} - ${address}</p>
                <p style="margin: 6px 0;"><strong>Price:</strong> ${monthlyPrice} XAF / month</p>
                <p style="margin: 6px 0;"><strong>Bedrooms:</strong> ${bedrooms} | <strong>Bathrooms:</strong> ${bathrooms}</p>
              </div>

              <a href="${propertyUrl}" class="button">View Property</a>
            </div>
          </body>
          </html>
        `;

        return sendEmail(recipient.email, subject, html);
      })
    );

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value?.success) {
        sent += 1;
      } else {
        failed += 1;
      }
    });
  }

  return {
    total: recipients.length,
    sent,
    failed
  };
};

const sendPropertyTakenFavoriteNotificationEmail = async ({ recipients = [], property, landlordName }) => {
  const propertyTitle = escapeHtml(property?.title || 'Property');
  const city = escapeHtml(property?.location?.city || 'Cameroon');
  const address = escapeHtml(property?.location?.address || 'See listing for details');
  const monthlyPrice = formatCurrency(property?.price);
  const landlordDisplayName = escapeHtml(landlordName || 'The landlord');
  const propertyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/properties/${property?._id || property?.id}`;

  const favoriteRecipients = (recipients || [])
    .filter((recipient) => recipient?.email)
    .map((recipient) => ({
      email: recipient.email,
      name: recipient.name || 'Tenant'
    }));

  if (!favoriteRecipients.length) {
    return { total: 0, sent: 0, failed: 0 };
  }

  const subject = `Listing Update: ${propertyTitle} is now taken`;
  const batchSize = 20;
  let sent = 0;
  let failed = 0;

  for (let index = 0; index < favoriteRecipients.length; index += batchSize) {
    const batch = favoriteRecipients.slice(index, index + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((recipient) => {
        const recipientName = escapeHtml(recipient.name);
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Property Listing Update</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 620px; margin: 0 auto; padding: 20px; }
              .header { background: #0B6E4F; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
              .card { background: #fff; border: 1px solid #e7ecef; border-radius: 8px; padding: 16px; margin: 14px 0; }
              .status { display: inline-block; background: #f59e0b; color: white; padding: 6px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; }
              .button { display: inline-block; background: #0B6E4F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 16px; }
              .meta { color: #667085; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>CAMRENT</h1>
              <p>Update on a property you favorited</p>
            </div>
            <div class="content">
              <p>Hello ${recipientName},</p>
              <p>The property below, listed by ${landlordDisplayName}, has just been marked as taken.</p>

              <div class="card">
                <h2 style="margin: 0 0 8px;">${propertyTitle}</h2>
                <p class="meta" style="margin: 0 0 8px;">${city} - ${address}</p>
                <p style="margin: 6px 0;"><strong>Price:</strong> ${monthlyPrice} XAF / month</p>
                <p style="margin: 10px 0 0;"><span class="status">Taken</span></p>
              </div>

              <p>You can continue browsing similar homes on CAMRENT.</p>
              <a href="${propertyUrl}" class="button">View Listing</a>
            </div>
          </body>
          </html>
        `;

        return sendEmail(recipient.email, subject, html);
      })
    );

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value?.success) {
        sent += 1;
      } else {
        failed += 1;
      }
    });
  }

  return {
    total: favoriteRecipients.length,
    sent,
    failed
  };
};

// Send password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const subject = 'CAMRENT - Password Reset Request';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CAMRENT - Password Reset</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: #0B6E4F;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #f8f9fa;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .button {
          display: inline-block;
          background: #0B6E4F;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
          font-size: 14px;
        }
        .warning {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏠 CAMRENT</h1>
        <p>Cameroon's Trusted Rental Platform</p>
      </div>
      
      <div class="content">
        <h2>Password Reset Request</h2>
        <p>Hello ${user.name},</p>
        <p>We received a request to reset your password for your CAMRENT account. Click the button below to reset your password:</p>
        
        <div style="text-align: center;">
          <a href="${resetUrl}" class="button">Reset Password</a>
        </div>
        
        <div class="warning">
          <strong>Important:</strong> This link will expire in 1 hour for security reasons. If you didn't request this password reset, please ignore this email.
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px;">
          ${resetUrl}
        </p>
        
        <p>If you have any questions or didn't request this reset, please contact our support team.</p>
      </div>
      
      <div class="footer">
        <p>© 2024 CAMRENT. All rights reserved.</p>
        <p>This is an automated message, please do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(user.email, subject, html);
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  const subject = 'Welcome to CAMRENT - Your Rental Journey Starts Here!';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to CAMRENT</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: #0B6E4F;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #f8f9fa;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .button {
          display: inline-block;
          background: #0B6E4F;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
          font-size: 14px;
        }
        .feature {
          background: white;
          padding: 15px;
          border-radius: 5px;
          margin: 10px 0;
          border-left: 4px solid #0B6E4F;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏠 CAMRENT</h1>
        <p>Cameroon's Trusted Rental Platform</p>
      </div>
      
      <div class="content">
        <h2>Welcome to CAMRENT, ${user.name}!</h2>
        <p>Thank you for joining Cameroon's premier rental platform. We're excited to help you find your perfect home or connect with quality tenants.</p>
        
        <div class="feature">
          <h3>🔍 ${user.role === 'tenant' ? 'Browse Properties' : user.role === 'landlord' ? 'List Properties' : 'Manage Platform'}</h3>
          <p>${user.role === 'tenant' ? 'Discover verified rental properties across Cameroon' : user.role === 'landlord' ? 'List and manage your rental properties with ease' : 'Oversee the entire rental platform'}</p>
        </div>
        
        <div class="feature">
          <h3>🛡️ Safe & Secure</h3>
          <p>All landlords are verified, and all transactions are protected</p>
        </div>
        
        <div class="feature">
          <h3>📱 Easy to Use</h3>
          <p>Modern, intuitive platform designed for Cameroon</p>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Get Started</a>
        </div>
        
        <p>If you have any questions, feel free to contact our support team. We're here to help!</p>
      </div>
      
      <div class="footer">
        <p>© 2024 CAMRENT. All rights reserved.</p>
        <p>This is an automated message, please do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(user.email, subject, html);
};

// Send verification approval email
const sendVerificationApprovedEmail = async (user) => {
  const subject = '🎉 Your Landlord Account Has Been Approved!';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Landlord Verification Approved</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: #0B6E4F;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #f8f9fa;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .button {
          display: inline-block;
          background: #0B6E4F;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
          font-size: 14px;
        }
        .success {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏠 CAMRENT</h1>
        <p>Cameroon's Trusted Rental Platform</p>
      </div>
      
      <div class="content">
        <h2>🎉 Congratulations, ${user.name}!</h2>
        
        <div class="success">
          <strong>Your landlord account has been successfully approved!</strong>
        </div>
        
        <p>You can now start listing your rental properties on CAMRENT and connect with quality tenants across Cameroon.</p>
        
        <h3>What you can do now:</h3>
        <ul>
          <li>📝 List your rental properties with photos and details</li>
          <li>💰 Set competitive rental prices</li>
          <li>📊 Track property views and inquiries</li>
          <li>💬 Communicate directly with potential tenants</li>
        </ul>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/landlord/dashboard" class="button">Go to Your Dashboard</a>
        </div>
        
        <p>Thank you for choosing CAMRENT. We look forward to helping you find great tenants for your properties!</p>
      </div>
      
      <div class="footer">
        <p>© 2024 CAMRENT. All rights reserved.</p>
        <p>This is an automated message, please do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(user.email, subject, html);
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendVerificationApprovedEmail,
  sendNewPropertyBroadcastEmail,
  sendPropertyTakenFavoriteNotificationEmail,
};
