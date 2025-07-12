const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');
const mlService = require('../services/mlService');
const logger = require('../config/logger');

const router = express.Router();

/**
 * POST /api/pricing/predict
 * Get ML price prediction for a single product
 */
router.post('/predict', auth, [
  body('productId').isMongoId().withMessage('Invalid product ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findById(req.body.productId);
    
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Prepare data for ML prediction
    const predictionData = {
      current_price: product.currentPrice,
      days_to_expiry: product.daysToExpiry,
      stock_level: product.stockLevel,
      demand_score: product.demandScore,
      category: product.category,
      historical_sales: product.historicalSales,
      day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    };

    const prediction = await mlService.predictPrice(predictionData);
    
    res.json({
      productId: product._id,
      productName: product.name,
      currentPrice: product.currentPrice,
      recommendedPrice: prediction.recommended_price,
      confidence: prediction.confidence || null,
      factors: prediction.factors || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error predicting price:', error);
    res.status(500).json({ error: 'Failed to predict price' });
  }
});

/**
 * POST /api/pricing/update
 * Update prices for all products using ML predictions
 */
router.post('/update', auth, async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });
    const updateResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        // Skip if expired
        if (product.daysToExpiry < 0) {
          updateResults.push({
            productId: product._id,
            productName: product.name,
            status: 'skipped',
            reason: 'Product already expired'
          });
          continue;
        }

        // Prepare data for ML prediction
        const predictionData = {
          current_price: product.currentPrice,
          days_to_expiry: product.daysToExpiry,
          stock_level: product.stockLevel,
          demand_score: product.demandScore,
          category: product.category,
          historical_sales: product.historicalSales,
          day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        };

        const prediction = await mlService.predictPrice(predictionData);
        const recommendedPrice = prediction.recommended_price;

        // Only update if the price difference is significant (more than 5% or $1)
        const priceDifference = Math.abs(product.currentPrice - recommendedPrice);
        const percentageDifference = priceDifference / product.currentPrice;

        if (percentageDifference > 0.05 || priceDifference > 1) {
          await product.updatePrice(recommendedPrice, 'ml_prediction');
          
          updateResults.push({
            productId: product._id,
            productName: product.name,
            status: 'updated',
            oldPrice: product.currentPrice,
            newPrice: recommendedPrice,
            confidence: prediction.confidence || null
          });
          successCount++;
        } else {
          updateResults.push({
            productId: product._id,
            productName: product.name,
            status: 'no_change',
            reason: 'Price difference not significant'
          });
        }
      } catch (error) {
        logger.error(`Error updating price for product ${product._id}:`, error);
        updateResults.push({
          productId: product._id,
          productName: product.name,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }
    }

    logger.info(`Price update completed: ${successCount} updated, ${errorCount} errors`);
    
    res.json({
      summary: {
        totalProducts: products.length,
        updated: successCount,
        errors: errorCount,
        timestamp: new Date().toISOString()
      },
      results: updateResults
    });
  } catch (error) {
    logger.error('Error updating prices:', error);
    res.status(500).json({ error: 'Failed to update prices' });
  }
});

/**
 * POST /api/pricing/update/:id
 * Update price for a specific product using ML prediction
 */
router.post('/update/:id', auth, [
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

    // Check if product is expired
    if (product.daysToExpiry < 0) {
      return res.status(400).json({ error: 'Cannot update price for expired product' });
    }

    // Prepare data for ML prediction
    const predictionData = {
      current_price: product.currentPrice,
      days_to_expiry: product.daysToExpiry,
      stock_level: product.stockLevel,
      demand_score: product.demandScore,
      category: product.category,
      historical_sales: product.historicalSales,
      day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    };

    const prediction = await mlService.predictPrice(predictionData);
    const oldPrice = product.currentPrice;
    
    await product.updatePrice(prediction.recommended_price, 'ml_prediction');
    
    logger.info(`ML price update for ${product.name}: ${oldPrice} -> ${prediction.recommended_price}`);
    
    res.json({
      productId: product._id,
      productName: product.name,
      oldPrice,
      newPrice: prediction.recommended_price,
      confidence: prediction.confidence || null,
      factors: prediction.factors || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error updating product price:', error);
    res.status(500).json({ error: 'Failed to update product price' });
  }
});

/**
 * GET /api/pricing/analysis/:id
 * Get pricing analysis for a specific product
 */
router.get('/analysis/:id', auth, [
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

    // Calculate various pricing metrics
    const originalPrice = product.originalPrice;
    const currentPrice = product.currentPrice;
    const discountPercentage = product.discountPercentage;
    const daysToExpiry = product.daysToExpiry;
    
    // Price trend analysis
    const priceHistory = product.priceHistory.slice(-7); // Last 7 price changes
    const priceTrend = priceHistory.length > 1 ? 
      (priceHistory[priceHistory.length - 1].price - priceHistory[0].price) / priceHistory[0].price : 0;

    // Risk assessment
    let riskLevel = 'low';
    if (daysToExpiry <= 1) riskLevel = 'critical';
    else if (daysToExpiry <= 3) riskLevel = 'high';
    else if (daysToExpiry <= 7) riskLevel = 'medium';

    // Recommendations
    const recommendations = [];
    
    if (daysToExpiry <= 1) {
      recommendations.push('Critical: Product expires soon. Consider deep discount or donation.');
    } else if (daysToExpiry <= 3) {
      recommendations.push('High risk: Apply significant discount to move inventory quickly.');
    } else if (product.stockLevel > 100 && daysToExpiry <= 7) {
      recommendations.push('High stock with approaching expiry. Consider promotional pricing.');
    }
    
    if (product.demandScore < 0.3) {
      recommendations.push('Low demand detected. Consider marketing campaign or price reduction.');
    }

    res.json({
      product: {
        id: product._id,
        name: product.name,
        category: product.category,
        sku: product.sku
      },
      pricing: {
        originalPrice,
        currentPrice,
        discountPercentage,
        priceTrend: Math.round(priceTrend * 100) / 100
      },
      inventory: {
        stockLevel: product.stockLevel,
        daysToExpiry,
        expiryStatus: product.expiryStatus
      },
      metrics: {
        demandScore: product.demandScore,
        historicalSales: product.historicalSales,
        riskLevel
      },
      priceHistory: priceHistory.map(entry => ({
        price: entry.price,
        timestamp: entry.timestamp,
        reason: entry.reason
      })),
      recommendations
    });
  } catch (error) {
    logger.error('Error getting pricing analysis:', error);
    res.status(500).json({ error: 'Failed to get pricing analysis' });
  }
});

/**
 * GET /api/pricing/strategies
 * Get available pricing strategies and their descriptions
 */
router.get('/strategies', auth, (req, res) => {
  const strategies = [
    {
      name: 'ml_prediction',
      description: 'AI-powered pricing based on multiple factors',
      factors: ['expiry_date', 'demand', 'stock_level', 'historical_sales', 'category']
    },
    {
      name: 'expiry_based',
      description: 'Time-based pricing that increases discount as expiry approaches',
      factors: ['days_to_expiry']
    },
    {
      name: 'demand_based',
      description: 'Pricing based on current demand score',
      factors: ['demand_score', 'stock_level']
    },
    {
      name: 'inventory_clearance',
      description: 'Aggressive pricing to clear high stock levels',
      factors: ['stock_level', 'days_to_expiry']
    }
  ];

  res.json({ strategies });
});

module.exports = router;
