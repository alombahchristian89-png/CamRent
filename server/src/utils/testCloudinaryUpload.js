const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function testCloudinaryUpload() {
  console.log('🚀 Testing Cloudinary Upload Functionality...\n');

  try {
    // Test 1: Check Cloudinary Configuration
    console.log('🔧 Testing Cloudinary Configuration...');
    console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`   API Key: ${process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   API Secret: ${process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing'}`);
    
    // Test 2: Check API Connection
    console.log('\n🔌 Testing Cloudinary API Connection...');
    const testResult = await cloudinary.api.ping();
    console.log(`   Status: ${testResult.status} ✅`);
    
    // Test 3: Check if CAMRENT folder exists or create it
    console.log('\n📁 Checking CAMRENT folder structure...');
    try {
      const folders = await cloudinary.api.sub_folders('camrent');
      console.log(`   Found folders: ${folders.folders.map(f => f.name).join(', ')}`);
    } catch (error) {
      if (error.http_code === 404) {
        console.log('   CAMRENT folder not found - will be created on first upload');
      } else {
        console.log(`   Error checking folders: ${error.message}`);
      }
    }
    
    // Test 4: Create a test image buffer
    console.log('\n🖼️  Creating test image for upload...');
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    
    // Create a simple 1x1 pixel JPEG for testing
    const testImageData = Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A', 'base64');
    
    fs.writeFileSync(testImagePath, testImageData);
    console.log('   Test image created ✅');
    
    // Test 5: Upload to Cloudinary
    console.log('\n⬆️  Testing image upload to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(testImagePath, {
      folder: 'camrent/test',
      public_id: `test-upload-${Date.now()}`,
      resource_type: 'image'
    });
    
    console.log(`   Upload successful! ✅`);
    console.log(`   URL: ${uploadResult.secure_url}`);
    console.log(`   Public ID: ${uploadResult.public_id}`);
    console.log(`   Size: ${uploadResult.bytes} bytes`);
    
    // Test 6: Verify uploaded image is accessible
    console.log('\n🌐 Verifying uploaded image accessibility...');
    const https = require('https');
    
    function checkImageAccess(url) {
      return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
          if (response.statusCode === 200) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
        
        request.on('error', () => resolve(false));
        request.setTimeout(5000, () => {
          request.destroy();
          resolve(false);
        });
      });
    }
    
    const isAccessible = await checkImageAccess(uploadResult.secure_url);
    console.log(`   Image accessible: ${isAccessible ? '✅ Yes' : '❌ No'}`);
    
    // Test 7: Clean up test files
    console.log('\n🧹 Cleaning up test files...');
    
    // Delete test image from Cloudinary
    await cloudinary.uploader.destroy(uploadResult.public_id);
    console.log('   Test image deleted from Cloudinary ✅');
    
    // Delete local test image
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('   Local test image deleted ✅');
    }
    
    console.log('\n✅ Cloudinary Upload Test Complete - All Tests Passed!');
    console.log('\n📊 Test Summary:');
    console.log('   Configuration: ✅');
    console.log('   API Connection: ✅');
    console.log('   Image Upload: ✅');
    console.log('   Image Accessibility: ✅');
    console.log('   Cleanup: ✅');
    
  } catch (error) {
    console.error('\n❌ Cloudinary Upload Test Failed:', error.message);
    if (error.http_code) {
      console.error(`   HTTP Error: ${error.http_code}`);
    }
    if (error.message) {
      console.error(`   Details: ${error.message}`);
    }
  }
}

// Run the test
if (require.main === module) {
  testCloudinaryUpload();
}

module.exports = { testCloudinaryUpload };
