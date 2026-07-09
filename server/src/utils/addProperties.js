const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Property = require('../models/Property');

dotenv.config();

async function addProperties() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camrent');
    console.log('Connected to MongoDB');

    // Find the landlord
    const landlord = await User.findOne({ email: 'landlordmain@gmail.com' });
    
    if (!landlord) {
      console.log('❌ Landlord not found. Please create users first.');
      return;
    }

    // Clear existing properties
    await Property.deleteMany({});
    console.log('Cleared existing properties');

    // Create sample properties
    const properties = [
      {
        title: 'Luxury 3-Bedroom Apartment in Bonapriso',
        description: 'Modern luxury apartment in the heart of Bonapriso, Douala. Features include air conditioning, parking, 24/7 security, and stunning city views.',
        price: 250000,
        location: {
          city: 'Douala',
          address: 'Bonapriso, Rue de la République'
        },
        images: [
          'https://res.cloudinary.com/demo/image/upload/luxury_apartment1.jpg',
          'https://res.cloudinary.com/demo/image/upload/luxury_apartment2.jpg',
          'https://res.cloudinary.com/demo/image/upload/luxury_apartment3.jpg'
        ],
        amenities: ['Parking', 'Security', 'Air Conditioning', 'Water', 'Electricity', 'Kitchen', 'Balcony', 'Gym'],
        propertyType: 'apartment',
        bedrooms: 3,
        bathrooms: 2,
        area: 120,
        availableFrom: new Date('2024-02-01'),
        landlord: landlord._id,
        isApproved: true,
        isActive: true,
        views: 0,
        inquiries: 0
      },
      {
        title: 'Cozy 1-Bedroom Studio in Makepe',
        description: 'Perfect studio apartment for students or young professionals. Affordable, well-maintained, and located in a quiet area of Makepe.',
        price: 60000,
        location: {
          city: 'Douala',
          address: 'Makepe, Quartier Bonamoussadi'
        },
        images: [
          'https://res.cloudinary.com/demo/image/upload/studio_makepe1.jpg',
          'https://res.cloudinary.com/demo/image/upload/studio_makepe2.jpg'
        ],
        amenities: ['Security', 'Water', 'Electricity', 'Kitchen'],
        propertyType: 'studio',
        bedrooms: 1,
        bathrooms: 1,
        area: 40,
        availableFrom: new Date('2024-01-15'),
        landlord: landlord._id,
        isApproved: true,
        isActive: true,
        views: 0,
        inquiries: 0
      }
    ];

    for (const propertyData of properties) {
      const property = new Property(propertyData);
      await property.save();
      console.log(`✅ Created property: ${property.title}`);
    }

    console.log('\n🎉 Sample properties added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding properties:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the function
if (require.main === module) {
  addProperties();
}

module.exports = addProperties;
