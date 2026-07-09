const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const cloudinary = require('cloudinary').v2;

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function testAdminDelete() {
  console.log('🧪 Testing Admin Property Deletion with Image Cleanup...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camrent');
    console.log('✅ Connected to MongoDB');

    // Find a property with Cloudinary images
    const properties = await Property.find({
      'images.url': { $regex: 'cloudinary', $options: 'i' }
    });

    if (properties.length === 0) {
      console.log('❌ No properties with Cloudinary images found for testing');
      return;
    }

    const testProperty = properties[0];
    console.log(`🏠 Found test property: ${testProperty.title}`);
    console.log(`   Images: ${testProperty.images.length}`);
    
    // List images before deletion
    console.log('\n📸 Images before deletion:');
    for (let i = 0; i < testProperty.images.length; i++) {
      const image = testProperty.images[i];
      console.log(`   ${i + 1}. ${image.url}`);
      
      // Check if image exists on Cloudinary
      if (image.url.includes('cloudinary')) {
        try {
          const publicId = image.url.split('/').pop().split('.')[0];
          const folder = image.url.includes('/properties/') ? 'camrent/properties' : 'camrent';
          const fullPublicId = `${folder}/${publicId}`;
          
          const result = await cloudinary.api.resource(fullPublicId);
          console.log(`      ✅ Exists on Cloudinary (${result.bytes} bytes)`);
        } catch (error) {
          console.log(`      ❌ Not found on Cloudinary: ${error.message}`);
        }
      }
    }

    // Simulate admin deletion process
    console.log('\n🗑️  Simulating admin deletion...');
    
    // Delete images from Cloudinary (same logic as in controller)
    const { deleteFromCloudinary, getPublicIdFromUrl } = require('../services/cloudinary');
    
    let deletedImages = 0;
    for (const image of testProperty.images) {
      if (image.url) {
        try {
          const publicId = getPublicIdFromUrl(image.url);
          if (publicId) {
            await deleteFromCloudinary(publicId, 'image');
            console.log(`   ✅ Deleted: ${publicId}`);
            deletedImages++;
          }
        } catch (error) {
          console.log(`   ❌ Failed to delete ${image.url}: ${error.message}`);
        }
      }
    }

    // Delete property from database
    await Property.findByIdAndDelete(testProperty._id);
    console.log(`✅ Property deleted from database`);

    // Verify deletion
    const deletedProperty = await Property.findById(testProperty._id);
    if (!deletedProperty) {
      console.log('✅ Property deletion verified');
    } else {
      console.log('❌ Property still exists in database');
    }

    // Verify images are deleted from Cloudinary
    console.log('\n🔍 Verifying image deletion...');
    for (let i = 0; i < testProperty.images.length; i++) {
      const image = testProperty.images[i];
      if (image.url.includes('cloudinary')) {
        try {
          const publicId = image.url.split('/').pop().split('.')[0];
          const folder = image.url.includes('/properties/') ? 'camrent/properties' : 'camrent';
          const fullPublicId = `${folder}/${publicId}`;
          
          await cloudinary.api.resource(fullPublicId);
          console.log(`   ❌ Image still exists: ${fullPublicId}`);
        } catch (error) {
          console.log(`   ✅ Image successfully deleted: ${image.url}`);
        }
      }
    }

    console.log('\n✅ Admin deletion test completed!');
    console.log(`📊 Summary: Deleted ${deletedImages} images and 1 property`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testAdminDelete();
}

module.exports = { testAdminDelete };
