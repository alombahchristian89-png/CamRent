const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

async function createPendingLandlord() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camrent');
    console.log('Connected to MongoDB');

    // Create a pending landlord
    const hashedPassword = await bcrypt.hash('TheDeveloperMail@1', 12);
    
    const pendingLandlord = new User({
      name: 'PENDING LANDLORD',
      email: 'pendinglandlord@gmail.com',
      password: hashedPassword,
      role: 'landlord',
      phone: '+237 555 123 456',
      verificationStatus: 'pending',
      documents: [
        'https://res.cloudinary.com/demo/image/upload/pending_id.jpg',
        'https://res.cloudinary.com/demo/image/upload/pending_deed.pdf'
      ]
    });

    await pendingLandlord.save();
    console.log('✅ Created pending landlord for testing');
    console.log('Email: pendinglandlord@gmail.com / Password: TheDeveloperMail@1');
    console.log('Status: pending verification');
    
  } catch (error) {
    console.error('❌ Error creating pending landlord:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
if (require.main === module) {
  createPendingLandlord();
}

module.exports = createPendingLandlord;
