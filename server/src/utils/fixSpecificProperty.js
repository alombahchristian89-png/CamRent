const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Property = require('../models/Property');

dotenv.config();

async function fixSpecificProperty() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camrent');
    console.log('✅ Connected to MongoDB');

    // Find the specific property with blob URLs
    const property = await Property.findOne({ title: 'THE IMAGE TEST ROOM' });
    
    if (!property) {
      console.log('❌ Property "THE IMAGE TEST ROOM" not found');
      return;
    }

    console.log(`🏠 Found property: ${property.title}`);
    console.log(`   Current images: ${property.images.length}`);
    
    // Check for blob URLs
    const blobImages = property.images.filter(img => img.url && img.url.startsWith('blob:'));
    console.log(`   Blob URLs found: ${blobImages.length}`);
    
    if (blobImages.length > 0) {
      // Replace with working placeholder URLs
      const sampleImages = [
        'https://picsum.photos/800/600?random=20',
        'https://picsum.photos/800/600?random=21',
        'https://picsum.photos/800/600?random=22',
        'https://picsum.photos/800/600?random=23',
        'https://picsum.photos/800/600?random=24'
      ];
      
      let updatedImages = [];
      for (let i = 0; i < property.images.length; i++) {
        updatedImages.push({
          name: `property-image-${i + 1}`,
          url: sampleImages[i % sampleImages.length],
          type: 'image/jpeg'
        });
        console.log(`   Image ${i + 1}: ${sampleImages[i % sampleImages.length]}`);
      }
      
      property.images = updatedImages;
      await property.save();
      
      console.log(`✅ Fixed ${property.title} - replaced blob URLs with working images`);
    } else {
      console.log(`   No blob URLs found - images are already OK`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing property:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the fix
if (require.main === module) {
  fixSpecificProperty();
}

module.exports = { fixSpecificProperty };
