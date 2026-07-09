# CAMRENT - Rental & House Hunting Platform (Cameroon Focused)

A comprehensive rental platform connecting tenants and landlords in Cameroon with verified listings and secure transactions.

## 🌟 Features

### 🔐 Authentication System
- JWT-based authentication with refresh tokens
- Role-based access control (Tenant, Landlord, Admin)
- Secure password hashing with bcrypt
- Email & password authentication

### 🏠 Tenant Portal
- Browse verified property listings
- Advanced filtering (location, price, property type, rooms)
- Property details with image galleries
- Save/favorite properties
- Contact landlords directly
- Inquiry management system
- Personal dashboard with saved listings

### 🏢 Landlord Portal
- **Verification System**: Admin approval required before listing
- Property management (CRUD operations)
- Upload multiple property images
- Set pricing, amenities, and availability
- View listing performance (views, inquiries)
- Manage tenant inquiries
- Dashboard with analytics

### 🛡️ Admin Portal
- User management (ban/suspend accounts)
- Landlord verification system
- Property review and management
- Platform analytics and statistics
- System monitoring dashboard

### 📁 File Management
- Cloudinary integration for image uploads
- Document upload for landlord verification
- Profile image management
- Automatic image optimization

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Multer** + **Cloudinary** for file uploads
- **bcryptjs** for password hashing
- **express-validator** for input validation
- **express-rate-limit** for security

### Frontend
- **React 18** with Vite
- **React Router** for navigation
- **React Query** for data fetching
- **React Hook Form** for form management
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Axios** for API calls

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Cloudinary account (for file uploads)

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd CAMRENT
```

### 2. Backend Setup
```bash
cd server
npm install
```

### 3. Environment Variables
Create a `.env` file in the server directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/camrent
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NODE_ENV=development
```

### 4. Database Setup
- Install and run MongoDB locally or use MongoDB Atlas
- The database will be created automatically on first run

### 5. Seed Sample Data (Optional)
```bash
npm run seed
```

### 6. Start Backend Server
```bash
npm run dev
```

### 7. Frontend Setup
```bash
cd client
npm install
```

### 8. Start Frontend Development Server
```bash
npm run dev
```

### 9. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📊 Database Schema

### Users Collection
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (tenant/landlord/admin),
  isVerified: Boolean (for landlords),
  verificationStatus: String (pending/approved/rejected),
  documents: [String] (file URLs),
  profileImage: String,
  phone: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Properties Collection
```javascript
{
  title: String,
  description: String,
  price: Number,
  location: {
    city: String,
    address: String,
    coordinates: { latitude: Number, longitude: Number }
  },
  images: [String],
  amenities: [String],
  propertyType: String (studio/apartment/house/villa/commercial),
  bedrooms: Number,
  bathrooms: Number,
  area: Number,
  landlord: ObjectId (ref: User),
  isApproved: Boolean,
  isActive: Boolean,
  views: Number,
  inquiries: Number,
  availableFrom: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Favorites Collection
```javascript
{
  userId: ObjectId (ref: User),
  propertyId: ObjectId (ref: Property),
  createdAt: Date
}
```

### Inquiries Collection
```javascript
{
  tenantId: ObjectId (ref: User),
  landlordId: ObjectId (ref: User),
  propertyId: ObjectId (ref: Property),
  message: String,
  status: String (pending/responded/closed),
  tenantContact: {
    name: String,
    email: String,
    phone: String
  },
  landlordResponse: {
    message: String,
    respondedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Properties
- `GET /api/properties` - Get all properties (with filtering)
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create property (landlord only)
- `PUT /api/properties/:id` - Update property (landlord only)
- `DELETE /api/properties/:id` - Delete property (landlord only)
- `GET /api/properties/landlord/my-properties` - Get landlord's properties

### Favorites
- `POST /api/favorites` - Add to favorites
- `DELETE /api/favorites/:propertyId` - Remove from favorites
- `GET /api/favorites` - Get user's favorites
- `GET /api/favorites/check/:propertyId` - Check if property is favorited

### Inquiries
- `POST /api/inquiries` - Send inquiry (tenant only)
- `GET /api/inquiries/tenant` - Get tenant's inquiries
- `GET /api/inquiries/landlord` - Get landlord's inquiries
- `PUT /api/inquiries/:id/respond` - Respond to inquiry (landlord only)
- `PUT /api/inquiries/:id/close` - Close inquiry

### Landlord
- `POST /api/landlord/verify` - Submit verification documents
- `GET /api/landlord/verification-status` - Get verification status
- `GET /api/landlord/dashboard` - Get landlord dashboard stats

### Admin
- `GET /api/admin/dashboard` - Get admin dashboard stats
- `GET /api/admin/landlords` - Get all landlords
- `PUT /api/admin/verify/:id` - Verify/reject landlord
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/ban` - Ban/unban user
- `GET /api/admin/properties` - Get all properties
- `DELETE /api/admin/properties/:id` - Delete property

### File Upload
- `POST /api/upload/property-images` - Upload property images
- `POST /api/upload/documents` - Upload verification documents
- `POST /api/upload/profile-image` - Upload profile image
- `DELETE /api/upload/file` - Delete file from Cloudinary

## 🎨 UI/UX Design

### Color Palette
- **Primary**: #0B6E4F (Deep Green - trust, growth)
- **Secondary**: #F4A261 (Warm Orange - call-to-action)
- **Background**: #F8F9FA (light gray)
- **Text**: #1F2937 (dark gray)
- **Accent**: #2A9D8F

### Design Principles
- Clean, modern, minimal UI
- Card-based property display
- Rounded corners (border-radius: 12px+)
- Soft shadows
- Mobile-first responsive design
- Smooth hover animations

## 🔒 Security Features

- JWT authentication with access and refresh tokens
- Role-based middleware protection
- Input validation and sanitization
- Rate limiting to prevent abuse
- Secure file upload handling
- Password hashing with bcrypt
- Environment variable protection

## 🌍 Cameroon-Specific Features

- Major Cameroonian cities (Douala, Yaoundé, Bamenda, etc.)
- Local currency support (XAF)
- Phone number validation for Cameroon
- Address formats for Cameroonian locations
- Localized user experience

## 📱 Responsive Design

The application is fully responsive and works seamlessly on:
- Desktop computers
- Tablets
- Mobile phones
- Various screen sizes

## 🚀 Deployment

### Production Build
```bash
# Frontend
cd client
npm run build

# Backend
cd server
npm start
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use a secure MongoDB connection string
- Configure production Cloudinary settings
- Use strong JWT secrets
- Set up proper CORS origins

## 🧪 Testing

The application includes:
- Input validation on all forms
- Error handling for API calls
- User feedback with toast notifications
- Protected routes verification
- File upload testing

## 📈 Performance Optimizations

- Image optimization through Cloudinary
- Pagination for large data sets
- Lazy loading for images
- React Query for efficient data fetching
- Debounced search functionality
- Component-level code splitting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support or questions:
- Check the documentation
- Review the API endpoints
- Test with the sample data
- Check browser console for errors

## 🎯 Future Enhancements

- Real-time chat between tenants and landlords
- Map integration for property locations
- Payment processing integration
- Advanced analytics dashboard
- Mobile app development
- Multi-language support
- Property recommendation system
- Automated rental agreements
