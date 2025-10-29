const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Simple SMTP connection test
 * This script tests your SMTP credentials independently
 */

async function testSMTPConnection() {
  const testRecipient = 'palanig.project@gmail.com';
  
  console.log('🔍 Testing SMTP Connection...');
  console.log('Host:', process.env.MAIL_HOST);
  console.log('Port:', process.env.MAIL_PORT);
  console.log('User:', process.env.MAIL_USER);
  console.log('From:', process.env.MAIL_FROM);
  console.log('To:', testRecipient);
  console.log('');

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT) || 587,
      secure: process.env.MAIL_PORT == 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      },
      requireTLS: true,
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000
    });

    console.log('✅ Transporter created successfully');

    // Verify connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');

    // Send test email
    console.log('📤 Sending test email...');
    console.log('📧 Email Details:');
    console.log('   From:', process.env.MAIL_FROM || process.env.MAIL_USER);
    console.log('   To:', testRecipient);
    console.log('   Subject: SMTP Test Email');
    
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: testRecipient,
      subject: 'SMTP Test Email',
      text: 'This is a test email to verify SMTP configuration.',
      html: '<h1>SMTP Test Email</h1><p>This is a test email to verify SMTP configuration.</p>'
    });

    console.log('✅ Test email sent successfully!');
    console.log('📧 Email Details:');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('   Accepted:', info.accepted);
    console.log('   Rejected:', info.rejected);
    
    // Check if email was accepted or rejected
    if (info.accepted && info.accepted.length > 0) {
      console.log('✅ Email was accepted by the server');
      console.log('📬 Please check the recipient\'s inbox and spam folder');
    }
    
    if (info.rejected && info.rejected.length > 0) {
      console.log('❌ Email was rejected by the server');
      console.log('Rejected addresses:', info.rejected);
    }
    
    console.log('\n💡 Email Delivery Tips:');
    console.log('1. Check the recipient\'s inbox and spam/junk folder');
    console.log('2. Email delivery can take a few minutes');
    console.log('3. Some corporate email systems may block external emails');
    console.log('4. Verify the recipient email address is correct');

  } catch (error) {
    console.error('❌ SMTP test failed:', error.message);
    
    if (error.message.includes('Authentication unsuccessful')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Make sure you\'re using an App Password, not your regular password');
      console.log('2. Generate a new App Password from Microsoft 365 admin center');
      console.log('3. Check if your account has SMTP access enabled');
      console.log('4. Verify the email address is correct');
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Network troubleshooting tips:');
      console.log('1. Check your internet connection');
      console.log('2. Verify the SMTP host and port are correct');
      console.log('3. Check if your firewall is blocking the connection');
    }
  }
}

// Run the test
testSMTPConnection().catch(console.error);
