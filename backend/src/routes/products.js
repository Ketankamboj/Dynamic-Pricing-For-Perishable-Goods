const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const Product = require('../models/Product');
const { auth, authorize } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

/**
 * Validation middleware for product creation/update
 */
const validateProduct = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Product name must be between 1 and 100 characters'),
  body('category')
    .isIn(['dairy', 'meat', 'vegetables', 'fruits', 'bakery', 'seafood', 'other'])
    .withMessage('Invalid category'),
  body('currentPrice')
    .isFloat({ min: 0 })
    .withMessage('Current price must be a positive number'),
  body('originalPrice')
    .isFloat({ min: 0 })
    .withMessage('Original price must be a positive number'),
  body('expiryDate')
    .isISO8601()
    .withMessage('Expiry date must be a valid date'),
  body('stockLevel')
    .isInt({ min: 0 })
    .withMessage('Stock level must be a non-negative integer'),
  body('demandScore')
    .isFloat({ min: 0, max: 1 })
    .withMessage('Demand score must be between 0 and 1'),
  body('sku')
    .trim()
    .isLength({ min: 1 })
    .withMessage('SKU is required')
];

/**
 * GET /api/products
 * Get all products with optional filtering and pagination
 */
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().isIn(['dairy', 'meat', 'vegetables', 'fruits', 'bakery', 'seafood', 'other']),
  query('sortBy').optional().isIn(['name', 'currentPrice', 'expiryDate', 'stockLevel', 'createdAt']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const filter = { isActive: true };
    
    // Add category filter if provided
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    // Add search filter if provided
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { sku: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Add expiry filter if provided
    if (req.query.expiringSoon) {
      const days = parseInt(req.query.expiringSoon) || 3;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);
      filter.expiryDate = { $lte: expiryDate };
    }

    // Build sort object
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-priceHistory'); // Exclude price history for list view

    const total = await Product.countDocuments(filter);
    
    res.json({
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * @route   GET /api/products/export
 * @desc    Export products as CSV or JSON
 * @access  Private
 */
router.get('/export', auth, [
  query('format').optional().isIn(['csv', 'json']).withMessage('Format must be csv or json'),
  query('category').optional().isIn(['dairy', 'meat', 'vegetables', 'fruits', 'bakery', 'seafood', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const format = req.query.format || 'csv';
    const filter = { isActive: true };
    
    // Add category filter if provided
    if (req.query.category) {
      filter.category = req.query.category;
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'Name,Category,Current Price,Original Price,Expiry Date,Stock Level,Demand Score,Historical Sales,SKU,Supplier,Created At\n';
      const csvRows = products.map(product => {
        return [
          `"${product.name}"`,
          product.category,
          product.currentPrice,
          product.originalPrice,
          product.expiryDate.toISOString().split('T')[0],
          product.stockLevel,
          product.demandScore,
          product.historicalSales,
          `"${product.sku}"`,
          `"${product.supplier || ''}"`,
          product.createdAt.toISOString().split('T')[0]
        ].join(',');
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      const filename = `products-export-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } else {
      // JSON format
      const filename = `products-export-${new Date().toISOString().split('T')[0]}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json({
        exportDate: new Date().toISOString(),
        totalProducts: products.length,
        products: products
      });
    }

    logger.info(`Products exported in ${format} format by user ${req.user.email}`);

  } catch (error) {
    logger.error('Error exporting products:', error);
    res.status(500).json({ error: 'Failed to export products' });
  }
});

/**
 * GET /api/products/:id
 * Get a single product by ID
 */
router.get('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid product ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);
    
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

/**
 * POST /api/products
 * Create a new product
 */
router.post('/', auth, validateProduct, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku: req.body.sku });
    if (existingProduct) {
      return res.status(400).json({ error: 'Product with this SKU already exists' });
    }

    const product = new Product(req.body);
    await product.save();
    
    logger.info(`Product created: ${product.name} (${product.sku})`);
    res.status(201).json(product);
  } catch (error) {
    logger.error('Error creating product:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Product with this SKU already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create product' });
    }
  }
});

/**
 * PUT /api/products/:id
 * Update a product
 */
router.put('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid product ID'),
  ...validateProduct
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);
    
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if SKU is being changed and if it already exists
    if (req.body.sku !== product.sku) {
      const existingProduct = await Product.findOne({ sku: req.body.sku });
      if (existingProduct) {
        return res.status(400).json({ error: 'Product with this SKU already exists' });
      }
    }

    // Update product fields
    Object.assign(product, req.body);
    await product.save();
    
    logger.info(`Product updated: ${product.name} (${product.sku})`);
    res.json(product);
  } catch (error) {
    logger.error('Error updating product:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Product with this SKU already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update product' });
    }
  }
});

/**
 * DELETE /api/products/:id
 * Soft delete a product (set isActive to false)
 */
router.delete('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid product ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);
    
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.isActive = false;
    await product.save();
    
    logger.info(`Product deleted: ${product.name} (${product.sku})`);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

/**
 * PATCH /api/products/:id/price
 * Update product price with reason
 */
router.patch('/:id/price', auth, [
  param('id').isMongoId().withMessage('Invalid product ID'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('reason').optional().isIn(['manual', 'ml_prediction', 'promotional', 'expiry_based'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);
    
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { price, reason = 'manual' } = req.body;
    await product.updatePrice(price, reason);
    
    logger.info(`Price updated for ${product.name}: ${price} (${reason})`);
    res.json(product);
  } catch (error) {
    logger.error('Error updating product price:', error);
    res.status(500).json({ error: 'Failed to update product price' });
  }
});

/**
 * GET /api/products/analytics/summary
 * Get products analytics summary
 */
router.get('/analytics/summary', auth, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({ isActive: true });
    const expiringSoon = await Product.countDocuments({
      isActive: true,
      expiryDate: { $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) }
    });
    const expired = await Product.countDocuments({
      isActive: true,
      expiryDate: { $lt: new Date() }
    });
    
    const categoryStats = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 }, avgPrice: { $avg: '$currentPrice' } } }
    ]);

    res.json({
      totalProducts,
      expiringSoon,
      expired,
      categoryStats
    });
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
