const Product = require('../models/Product');

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const { supermarketId } = req.query;
    console.log('Getting products with supermarketId:', supermarketId);
    
    const query = supermarketId ? { supermarketId } : {};
    console.log('Query:', JSON.stringify(query));
    
    const products = await Product.find(query).sort({ createdAt: -1 });
    console.log(`Found ${products.length} products`);
    
    res.json(products);
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create product
exports.addProduct = async (req, res) => {
  try {
    const productData = req.body;
    
    // إزالة id و _id من البيانات لأن MongoDB يولد _id تلقائياً
    delete productData.id;
    delete productData._id;
    
    console.log('Creating product with data:', JSON.stringify(productData, null, 2));
    
    if (!productData.name || !productData.price || !productData.supermarketId) {
      return res.status(400).json({ error: 'Name, price, and supermarketId are required' });
    }
    
    const product = new Product(productData);
    await product.save();
    
    console.log('Product created successfully:', product._id, product.name);
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // إزالة id و _id من البيانات لأن MongoDB لا يسمح بتحديث _id
    delete updates.id;
    delete updates._id;
    
    console.log('Updating product', id, 'with data:', JSON.stringify(updates, null, 2));
    
    const product = await Product.findByIdAndUpdate(id, updates, { new: true });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    console.log('Product updated successfully:', product._id, product.name);
    
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Search products
exports.searchProducts = async (req, res) => {
  try {
    const { q, supermarketId } = req.query;
    
    if (!q) {
      return res.json([]);
    }
    
    const query = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ],
    };
    
    if (supermarketId) {
      query.supermarketId = supermarketId;
    }
    
    const products = await Product.find(query);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


