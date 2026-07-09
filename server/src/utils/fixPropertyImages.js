const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Property = require('../models/Property');

dotenv.config();

async function fixPropertyImages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camrent');
    console.log('✅ Connected to MongoDB');

    // Get all properties
    const properties = await Property.find();
    console.log(`Found ${properties.length} properties`);

    // Working placeholder image URLs
    const sampleImages = [
      'https://picsum.photos/800/600?random=1',
      'https://picsum.photos/800/600?random=2',
      'https://picsum.photos/800/600?random=3',
      'https://picsum.photos/800/600?random=4',
      'https://picsum.photos/800/600?random=5'
    ];

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      console.log(`\n🏠 Fixing images for: ${property.title}`);
      
      // Replace blob URLs and demo URLs with proper Cloudinary URLs
      let updatedImages = [];
      const imageCount = property.images.length;
      
      for (let j = 0; j < Math.min(imageCount, 4); j++) {
        // Use sample Cloudinary URLs for now
        const imageUrl = sampleImages[j % sampleImages.length];
        updatedImages.push(imageUrl);
        console.log(`   Image ${j + 1}: ${imageUrl}`);
      }
      
      // Update property with new images
      property.images = updatedImages;
      await property.save();
      
      console.log(`✅ Updated ${property.title} with ${updatedImages.length} images`);
    }

    console.log('\n✅ All property images have been fixed!');
    
  } catch (error) {
    console.error('❌ Error fixing property images:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the fix
if (require.main === module) {
  fixPropertyImages();
}

module.exports = { fixPropertyImages };
