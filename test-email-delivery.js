const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Email delivery test with multiple recipients
 * This script tests email delivery to different addresses
 */

async function testEmailDelivery() {
  console.log('🔍 Testing Email Delivery to Multiple Recipients...');
  console.log('Host:', process.env.MAIL_HOST);
  console.log('Port:', process.env.MAIL_PORT);
  console.log('User:', process.env.MAIL_USER);
  console.log('From:', process.env.MAIL_FROM);
  console.log('');

  // Test different email addresses
  const testRecipients = [
    'palani.ga@cavininfotech.com'
  ];

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

    // Send test emails to multiple recipients
    for (let i = 0; i < testRecipients.length; i++) {
      const recipient = testRecipients[i];
      console.log(`\n📤 Sending test email ${i + 1}/${testRecipients.length}...`);
      console.log('📧 Email Details:');
      console.log('   From:', process.env.MAIL_FROM || process.env.MAIL_USER);
      console.log('   To:', recipient);
      console.log('   Subject: SMTP Test Email - Delivery Test');
      
      try {
        const info = await transporter.sendMail({
          from: process.env.MAIL_FROM || process.env.MAIL_USER,
          to: recipient,
          subject: `SMTP Test Email - Delivery Test ${i + 1}`,
          text: `This is test email ${i + 1} to verify SMTP configuration and delivery.\n\nRecipient: ${recipient}\nTimestamp: ${new Date().toISOString()}`,
          html: `
            <h1>SMTP Test Email - Delivery Test ${i + 1}</h1>
            <p>This is test email ${i + 1} to verify SMTP configuration and delivery.</p>
            <ul>
              <li><strong>Recipient:</strong> ${recipient}</li>
              <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
              <li><strong>Message ID:</strong> ${Date.now()}</li>
            </ul>
          `
        });

        console.log('✅ Test email sent successfully!');
        console.log('📧 Email Details:');
        console.log('   Message ID:', info.messageId);
        console.log('   Response:', info.response);
        console.log('   Accepted:', info.accepted);
        console.log('   Rejected:', info.rejected);
        
        if (info.accepted && info.accepted.length > 0) {
          console.log('✅ Email was accepted by the server');
        }
        
        if (info.rejected && info.rejected.length > 0) {
          console.log('❌ Email was rejected by the server');
          console.log('Rejected addresses:', info.rejected);
        }

        // Wait between emails
        if (i < testRecipients.length - 1) {
          console.log('⏳ Waiting 3 seconds before next email...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

      } catch (emailError) {
        console.error(`❌ Failed to send email to ${recipient}:`, emailError.message);
      }
    }

    console.log('\n🎉 Email delivery test completed!');
    console.log('\n💡 Troubleshooting Tips:');
    console.log('1. Check all recipients\' inbox and spam folders');
    console.log('2. Corporate email systems may filter internal emails');
    console.log('3. External emails (like Gmail) are more likely to be delivered');
    console.log('4. Some corporate systems block emails from the same domain');
    console.log('5. Email delivery can take 5-15 minutes');

  } catch (error) {
    console.error('❌ Email delivery test failed:', error.message);
  }
}

// Run the test
testEmailDelivery().catch(console.error);
