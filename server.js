const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint - يجب أن يكون قبل الـ API routes
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Munqeth API Server - Welcome!',
    version: '1.0.0',
    documentation: 'Visit /api for API information',
    endpoints: {
      api: '/api',
      health: '/api/health',
      users: '/api/users',
      products: '/api/products',
      orders: '/api/orders',
      drivers: '/api/drivers',
      advertisements: '/api/advertisements',
      cards: '/api/cards',
      supermarkets: '/api/supermarkets',
      images: '/api/images',
      locations: '/api/locations',
      maps: '/api/maps',
      admins: '/api/admins'
    }
  });
});

// Routes
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const driverRoutes = require('./routes/drivers');
const advertisementRoutes = require('./routes/advertisements');
const cardRoutes = require('./routes/cards');
const supermarketRoutes = require('./routes/supermarkets');
const imageRoutes = require('./routes/images');
const locationRoutes = require('./routes/locations');
const mapsRoutes = require('./routes/maps');
const adminRoutes = require('./routes/admins');

app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/supermarkets', supermarketRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/maps', mapsRoutes);
app.use('/api/admins', adminRoutes);

// API root endpoint
app.get('/api', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Munqeth API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      users: '/api/users',
      products: '/api/products',
      orders: '/api/orders',
      drivers: '/api/drivers',
      advertisements: '/api/advertisements',
      cards: '/api/cards',
      supermarkets: '/api/supermarkets',
      images: '/api/images',
      locations: '/api/locations',
      maps: '/api/maps',
      admins: '/api/admins'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// 404 Handler - يجب أن يكون بعد جميع الـ routes
app.use((req, res, next) => {
  res.status(404).json({ 
    status: 'ERROR', 
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    status: 'ERROR', 
    message: err.message || 'Internal server error'
  });
});

// Socket.IO for real-time tracking
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join driver room for location updates
  socket.on('driver:join', (driverId) => {
    socket.join(`driver:${driverId}`);
    console.log(`Driver ${driverId} joined room`);
  });

  // Update driver location
  socket.on('driver:location:update', (data) => {
    const { driverId, latitude, longitude } = data;
    // Broadcast to all clients tracking this driver
    io.to(`driver:${driverId}`).emit('driver:location:updated', {
      driverId,
      latitude,
      longitude,
      timestamp: new Date()
    });
  });

  // Join order tracking room
  socket.on('order:track', (orderId) => {
    socket.join(`order:${orderId}`);
    console.log(`Client tracking order ${orderId}`);
  });

  // Order status update
  socket.on('order:status:update', (data) => {
    const { orderId, status } = data;
    io.to(`order:${orderId}`).emit('order:status:updated', {
      orderId,
      status,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://munqeth7899:4NWuDr0AidjkmA1F@cluster0.knb2qgu.mongodb.net/munqeth?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Make io accessible to routes
app.set('io', io);

// Import order controller for expiration check
const orderController = require('./controllers/orderController');

// Cleanup expired orders on server startup (wait for MongoDB connection)
mongoose.connection.once('open', async () => {
  console.log('🧹 Running initial cleanup of expired orders...');
  try {
    await orderController.cleanupExpiredOrders(io);
  } catch (error) {
    console.error('Error in initial cleanup:', error);
  }
});

// Check for expired orders every minute
setInterval(async () => {
  try {
    await orderController.checkAndExpireOrders(io);
  } catch (error) {
    console.error('Error in expired orders check:', error);
  }
}, 60000); // Check every 60 seconds (1 minute)

console.log('⏰ Order expiration checker started (checks every 1 minute)');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on ${HOST}:${PORT}`);
  console.log(`📡 Socket.IO server is ready`);
});

module.exports = { app, io };

