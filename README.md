# Munqeth Backend API

Backend API server for Munqeth mobile application built with Node.js, Express, and MongoDB.

## Features

- ✅ RESTful API endpoints
- ✅ MongoDB database integration
- ✅ Cloudinary image upload
- ✅ Firebase Cloud Messaging for push notifications
- ✅ WebSocket (Socket.IO) for real-time location tracking
- ✅ Distance calculation for nearest drivers/supermarkets
- ✅ Support for multiple service types (delivery, taxi, maintenance, etc.)

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account (for image uploads)
- Firebase project (for push notifications)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
DB_NAME=munqeth

# Server
PORT=3000
NODE_ENV=development

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# JWT
JWT_SECRET=your_jwt_secret_key_here
```

3. Start the server:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/phone/:phone` - Get user by phone
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Products
- `GET /api/products` - Get all products (optional: ?supermarketId=xxx)
- `GET /api/products/search?q=query&supermarketId=xxx` - Search products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders
- `GET /api/orders` - Get all orders (optional: ?status=xxx&type=xxx&driverId=xxx&supermarketId=xxx)
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status
- `POST /api/orders/:id/accept` - Accept order by driver
- `GET /api/orders/nearest-driver?latitude=xxx&longitude=xxx&serviceType=xxx` - Find nearest driver

### Drivers
- `GET /api/drivers` - Get all drivers (optional: ?serviceType=xxx&isAvailable=true)
- `GET /api/drivers/available` - Get available drivers (optional: ?serviceType=xxx)
- `GET /api/drivers/nearest?latitude=xxx&longitude=xxx&serviceType=xxx` - Find nearest driver
- `GET /api/drivers/:id` - Get driver by ID
- `POST /api/drivers` - Create driver
- `PUT /api/drivers/:id` - Update driver
- `PUT /api/drivers/:id/location` - Update driver location

### Advertisements
- `GET /api/advertisements` - Get all advertisements (optional: ?serviceType=xxx&isActive=true)
- `GET /api/advertisements/:id` - Get advertisement by ID
- `POST /api/advertisements` - Create advertisement
- `PUT /api/advertisements/:id` - Update advertisement
- `DELETE /api/advertisements/:id` - Delete advertisement

### Cards
- `GET /api/cards` - Get all cards (optional: ?isUsed=true)
- `GET /api/cards/code/:code` - Get card by code
- `POST /api/cards` - Create card
- `POST /api/cards/redeem` - Redeem card

### Supermarkets
- `GET /api/supermarkets` - Get all supermarkets
- `GET /api/supermarkets/nearest?latitude=xxx&longitude=xxx` - Find nearest supermarket
- `GET /api/supermarkets/:id` - Get supermarket by ID
- `POST /api/supermarkets` - Create supermarket
- `PUT /api/supermarkets/:id` - Update supermarket
- `DELETE /api/supermarkets/:id` - Delete supermarket

### Images
- `POST /api/images/upload` - Upload single image (multipart/form-data, field: 'image')
- `POST /api/images/upload-multiple` - Upload multiple images (multipart/form-data, field: 'images')
- `DELETE /api/images/:publicId` - Delete image
- `GET /api/images/optimize?url=xxx&width=xxx&height=xxx&quality=xxx` - Get optimized image URL

### Locations
- `POST /api/locations/update` - Update location (body: {userId?, driverId?, latitude, longitude})
- `GET /api/locations/current?userId=xxx&driverId=xxx` - Get current location
- `GET /api/locations/distance?lat1=xxx&lon1=xxx&lat2=xxx&lon2=xxx` - Calculate distance

### Maps (Google Maps API)
- `GET /api/maps/status` - Check Google Maps API status
- `GET /api/maps/directions?originLat=xxx&originLng=xxx&destLat=xxx&destLng=xxx&mode=driving` - Get directions between two points
- `GET /api/maps/geocode?address=xxx` - Geocode address to coordinates
- `GET /api/maps/reverse-geocode?lat=xxx&lng=xxx` - Reverse geocode coordinates to address

### Health Check
- `GET /api/health` - Server health check

## WebSocket Events

### Client → Server
- `driver:join` - Join driver room (data: driverId)
- `driver:location:update` - Update driver location (data: {driverId, latitude, longitude})
- `order:track` - Track order (data: orderId)
- `order:status:update` - Update order status (data: {orderId, status})

### Server → Client
- `driver:location:updated` - Driver location updated (data: {driverId, latitude, longitude, timestamp})
- `order:new` - New order created (data: order)
- `order:status:updated` - Order status updated (data: {orderId, status, timestamp})

## Database Models

- **User**: name, phone, address, fcmToken
- **Product**: name, description, price, image, category, stock, isAvailable, supermarketId
- **Order**: type, customer info, items, status, driverId, location data
- **Driver**: code, name, phone, serviceType, location, isAvailable, fcmToken
- **Advertisement**: title, description, imageUrl, serviceType, discount info
- **Card**: code, amount, isUsed, usedBy, usedAt
- **Supermarket**: code, name, address, location

## Error Handling

All endpoints return errors in the following format:
```json
{
  "error": "Error message"
}
```

Status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

## Notes

- All phone numbers are normalized to Iraqi format
- Distances are calculated in kilometers using Haversine formula
- Image uploads are limited to 10MB per file
- Real-time location updates use WebSocket for low latency

## License

ISC


