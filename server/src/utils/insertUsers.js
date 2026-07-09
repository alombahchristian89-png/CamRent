const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');
const Property = require('../models/Property');

dotenv.config();

async function insertUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camrent');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Property.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const users = [
      {
        name: 'RENTAL ADMIN',
        email: 'keyadmin@camrent.com',
        password: 'TheDeveloperMail@1',
        role: 'admin',
        isVerified: true,
        verificationStatus: 'approved'
      },
      {
        name: 'PA LANDLORD',
        email: 'landlordmain@gmail.com',
        password: 'TheDeveloperMail@1',
        role: 'landlord',
        phone: '+237 123 456 789',
        isVerified: true,
        verificationStatus: 'approved',
        documents: [
          'https://res.cloudinary.com/demo/image/upload/sample_id.jpg',
          'https://res.cloudinary.com/demo/image/upload/sample_deed.pdf'
        ]
      },
      {
        name: 'TEST TERNANT',
        email: 'firstternant@gmail.com',
        password: 'TheDeveloperMail@1',
        role: 'tenant',
        phone: '+237 987 654 321'
      }
    ];

    const createdUsers = [];
    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      await user.save();
      createdUsers.push(user);
      console.log(`Created user: ${user.name} (${user.email})`);
    }

    // Create sample properties
    const landlord = createdUsers.find(u => u.email === 'landlordmain@gmail.com');
    
    if (landlord) {
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
        console.log(`Created property: ${property.title}`);
      }
    }

    console.log('\n✅ Users and properties inserted successfully!');
    console.log('\n📧 Login Credentials:');
    console.log('Admin: keyadmin@camrent.com / TheDeveloperMail@1');
    console.log('Landlord: landlordmain@gmail.com / TheDeveloperMail@1');
    console.log('Tenant: firstternant@gmail.com / TheDeveloperMail@1');
    
  } catch (error) {
    console.error('❌ Error inserting data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
if (require.main === module) {
  insertUsers();
}

module.exports = insertUsers;
