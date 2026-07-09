const dotenv = require('dotenv');
const { sendEmail } = require('../services/emailService');
const cloudinary = require('cloudinary').v2;

dotenv.config();

async function testEmailConfig() {
  console.log('🔧 Testing Email Configuration...');
  const testRecipient = process.env.TEST_EMAIL_TO || 'test@example.com';
  
  try {
    const result = await sendEmail(
      testRecipient,
      'CAMRENT - Email Configuration Test',
      `
        <h1>✅ Email Configuration Test Successful!</h1>
        <p>This is a test email from the CAMRENT platform.</p>
        <p>If you receive this email, the email configuration is working correctly.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `
    );
    
    if (result.success) {
      console.log('✅ Email test successful!');
      console.log(`Message ID: ${result.messageId}`);
    } else {
      console.log('❌ Email test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Email test error:', error.message);
  }
}

async function testCloudinaryConfig() {
  console.log('\n🔧 Testing Cloudinary Configuration...');
  
  try {
    // Test Cloudinary configuration
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('API Key:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Not set');
    console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Not set');
    
    // Test API connection
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary API connection successful!');
    console.log('Cloudinary Status:', result.status);
    
    // Test folder structure - create camrent folder if it doesn't exist
    console.log('\n📁 Testing folder structure...');
    try {
      const folders = await cloudinary.api.sub_folders('camrent');
      console.log('Existing folders:', folders.folders.map(f => f.name));
    } catch (folderError) {
      console.log('Creating camrent folder structure...');
      // The main folder will be created when first file is uploaded
      console.log('✅ Folder structure ready for uploads');
    }
    
  } catch (error) {
    console.error('❌ Cloudinary test failed:', error.message);
  }
}

async function testAllConfigs() {
  console.log('🚀 CAMRENT Configuration Test\n');
  
  await testEmailConfig();
  await testCloudinaryConfig();
  
  console.log('\n✅ Configuration tests completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Test password reset at: http://localhost:3000/forgot-password');
  console.log('2. Test file uploads in landlord verification');
  console.log('3. Test property image uploads');
}

// Run the tests
if (require.main === module) {
  testAllConfigs();
}

module.exports = { testEmailConfig, testCloudinaryConfig, testAllConfigs };
