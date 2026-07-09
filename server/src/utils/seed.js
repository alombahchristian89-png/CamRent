const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');
const Property = require('../models/Property');

dotenv.config();

// Sample data
const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@camrent.com',
    password: 'admin123',
    role: 'admin',
    isVerified: true,
    verificationStatus: 'approved'
  },
  {
    name: 'John Tenant',
    email: 'tenant@camrent.com',
    password: 'tenant123',
    role: 'tenant',
    phone: '+237 123 456 789'
  },
  {
    name: 'Mary Landlord',
    email: 'landlord@camrent.com',
    password: 'landlord123',
    role: 'landlord',
    phone: '+237 987 654 321',
    isVerified: true,
    verificationStatus: 'approved',
    documents: [
      'https://res.cloudinary.com/demo/image/upload/sample_id.jpg',
      'https://res.cloudinary.com/demo/image/upload/sample_deed.pdf'
    ]
  },
  {
    name: 'Peter Landlord',
    email: 'peter@camrent.com',
    password: 'landlord123',
    role: 'landlord',
    phone: '+237 555 123 456',
    verificationStatus: 'pending',
    documents: [
      'https://res.cloudinary.com/demo/image/upload/sample_id2.jpg'
    ]
  }
];

const sampleProperties = [
  {
    title: 'Modern 2-Bedroom Apartment in Bonapriso',
    description: 'Beautiful modern apartment in the heart of Bonapriso, Douala. Close to all amenities, shopping centers, and restaurants. Features include air conditioning, parking, and 24/7 security.',
    price: 150000,
    location: {
      city: 'Douala',
      address: 'Bonapriso, Rue de la République'
    },
    images: [
      'https://res.cloudinary.com/demo/image/upload/apartment1_living.jpg',
      'https://res.cloudinary.com/demo/image/upload/apartment1_bedroom.jpg',
      'https://res.cloudinary.com/demo/image/upload/apartment1_kitchen.jpg'
    ],
    amenities: ['Parking', 'Security', 'Air Conditioning', 'Water', 'Electricity', 'Kitchen', 'Balcony'],
    propertyType: 'apartment',
    bedrooms: 2,
    bathrooms: 1,
    area: 85,
    availableFrom: new Date('2024-02-01')
  },
  {
    title: 'Luxury Villa in Bastos',
    description: 'Spacious 4-bedroom villa in the prestigious Bastos neighborhood of Yaoundé. Perfect for families, with garden, swimming pool, and modern amenities.',
    price: 500000,
    location: {
      city: 'Yaoundé',
      address: 'Bastos, Avenue Charles de Gaulle'
    },
    images: [
      'https://res.cloudinary.com/demo/image/upload/villa1_exterior.jpg',
      'https://res.cloudinary.com/demo/image/upload/villa1_pool.jpg',
      'https://res.cloudinary.com/demo/image/upload/villa1_living.jpg'
    ],
    amenities: ['Parking', 'Security', 'Swimming Pool', 'Garden', 'Gym', 'Air Conditioning', 'Water', 'Electricity'],
    propertyType: 'villa',
    bedrooms: 4,
    bathrooms: 3,
    area: 250,
    availableFrom: new Date('2024-03-01')
  },
  {
    title: 'Cozy Studio in Makepe',
    description: 'Perfect studio apartment for students or young professionals. Affordable, well-maintained, and located in a quiet area of Makepe, Douala.',
    price: 45000,
    location: {
      city: 'Douala',
      address: 'Makepe, Quartier Bonamoussadi'
    },
    images: [
      'https://res.cloudinary.com/demo/image/upload/studio1_main.jpg',
      'https://res.cloudinary.com/demo/image/upload/studio1_kitchen.jpg'
    ],
    amenities: ['Security', 'Water', 'Electricity', 'Kitchen'],
    propertyType: 'studio',
    bedrooms: 1,
    bathrooms: 1,
    area: 35,
    availableFrom: new Date('2024-01-15')
  },
  {
    title: '3-Bedroom House in Bamenda',
    description: 'Family house located in a quiet neighborhood in Bamenda. Close to schools and markets. Features a small garden and parking space.',
    price: 120000,
    location: {
      city: 'Bamenda',
      address: 'Up Station, Nkwen'
    },
    images: [
      'https://res.cloudinary.com/demo/image/upload/house1_front.jpg',
      'https://res.cloudinary.com/demo/image/upload/house1_garden.jpg'
    ],
    amenities: ['Parking', 'Security', 'Water', 'Electricity', 'Garden'],
    propertyType: 'house',
    bedrooms: 3,
    bathrooms: 2,
    area: 120,
    availableFrom: new Date('2024-02-15')
  },
  {
    title: 'Office Space in Bafoussam',
    description: 'Commercial office space in the center of Bafoussam. Ideal for businesses, with good visibility and accessibility.',
    price: 80000,
    location: {
      city: 'Bafoussam',
      address: 'Centre Ville, Avenue des Nations'
    },
    images: [
      'https://res.cloudinary.com/demo/image/upload/office1_exterior.jpg',
      'https://res.cloudinary.com/demo/image/upload/office1_interior.jpg'
    ],
    amenities: ['Parking', 'Security', 'Water', 'Electricity', 'WiFi'],
    propertyType: 'commercial',
    bedrooms: 0,
    bathrooms: 2,
    area: 150,
    availableFrom: new Date('2024-01-20')
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camrent');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Property.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      await user.save();
      createdUsers.push(user);
      console.log(`Created user: ${user.name} (${user.email})`);
    }

    // Create properties
    const verifiedLandlord = createdUsers.find(u => u.email === 'landlord@camrent.com');
    if (verifiedLandlord) {
      for (const propertyData of sampleProperties) {
        const property = new Property({
          ...propertyData,
          landlord: verifiedLandlord._id
        });
        await property.save();
        console.log(`Created property: ${property.title}`);
      }
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📧 Login Credentials:');
    console.log('Admin: admin@camrent.com / admin123');
    console.log('Tenant: tenant@camrent.com / tenant123');
    console.log('Landlord: landlord@camrent.com / landlord123');
    console.log('Pending Landlord: peter@camrent.com / landlord123');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
