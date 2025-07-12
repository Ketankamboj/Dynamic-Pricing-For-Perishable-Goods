const axios = require('axios');
const logger = require('../config/logger');

/**
 * Machine Learning Service for price prediction
 * Communicates with Python ML service
 */
class MLService {
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    this.fallbackEnabled = process.env.ML_FALLBACK_ENABLED !== 'false';
  }

  /**
   * Predict optimal price for a product
   * @param {Object} productData - Product data for prediction
   * @returns {Object} Prediction result with recommended price
   */
  async predictPrice(productData) {
    try {
      // Validate required fields
      const requiredFields = ['current_price', 'days_to_expiry', 'stock_level', 'demand_score', 'category'];
      for (const field of requiredFields) {
        if (productData[field] === undefined || productData[field] === null) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Try ML service first
      try {
        const response = await axios.post(`${this.mlServiceUrl}/predict-price`, productData, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        logger.info('ML prediction successful');
        return response.data;
      } catch (mlError) {
        logger.warn('ML service unavailable, using fallback pricing', { error: mlError.message });
        
        if (this.fallbackEnabled) {
          return this.fallbackPricingStrategy(productData);
        } else {
          throw new Error('ML service unavailable and fallback disabled');
        }
      }
    } catch (error) {
      logger.error('Error in price prediction:', error);
      throw error;
    }
  }

  /**
   * Fallback pricing strategy when ML service is unavailable
   * Uses rule-based pricing logic
   * @param {Object} productData - Product data
   * @returns {Object} Pricing recommendation
   */
  fallbackPricingStrategy(productData) {
    const {
      current_price,
      days_to_expiry,
      stock_level,
      demand_score,
      category
    } = productData;

    let recommended_price = current_price;
    const factors = [];

    // Expiry-based pricing
    if (days_to_expiry <= 0) {
      recommended_price = current_price * 0.1; // 90% discount for expired items
      factors.push('expired_product');
    } else if (days_to_expiry <= 1) {
      recommended_price = current_price * 0.3; // 70% discount
      factors.push('critical_expiry');
    } else if (days_to_expiry <= 3) {
      recommended_price = current_price * 0.6; // 40% discount
      factors.push('approaching_expiry');
    } else if (days_to_expiry <= 7) {
      recommended_price = current_price * 0.8; // 20% discount
      factors.push('week_to_expiry');
    }

    // Demand-based adjustments
    if (demand_score < 0.2) {
      recommended_price *= 0.85; // Additional 15% discount for low demand
      factors.push('low_demand');
    } else if (demand_score > 0.8) {
      recommended_price *= 1.1; // 10% premium for high demand
      factors.push('high_demand');
    }

    // Stock level adjustments
    if (stock_level > 100) {
      recommended_price *= 0.9; // 10% discount for overstocking
      factors.push('high_stock');
    } else if (stock_level < 10) {
      recommended_price *= 1.05; // 5% premium for low stock
      factors.push('low_stock');
    }

    // Category-specific adjustments
    const categoryMultipliers = {
      'dairy': 0.95,      // Dairy products are more price sensitive
      'meat': 1.0,        // Neutral
      'vegetables': 0.9,  // High perishability
      'fruits': 0.9,      // High perishability
      'bakery': 0.85,     // Very perishable
      'seafood': 1.05,    // Premium category
      'other': 1.0        // Neutral
    };

    if (categoryMultipliers[category]) {
      recommended_price *= categoryMultipliers[category];
      factors.push(`category_${category}`);
    }

    // Ensure minimum price (10% of original)
    const minimum_price = current_price * 0.1;
    recommended_price = Math.max(recommended_price, minimum_price);

    // Round to 2 decimal places
    recommended_price = Math.round(recommended_price * 100) / 100;

    return {
      recommended_price,
      confidence: 0.7, // Lower confidence for rule-based pricing
      factors,
      method: 'fallback_rules',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Batch predict prices for multiple products
   * @param {Array} productsData - Array of product data
   * @returns {Array} Array of prediction results
   */
  async batchPredictPrices(productsData) {
    try {
      // Try ML service batch endpoint first
      try {
        const response = await axios.post(`${this.mlServiceUrl}/batch-predict`, {
          products: productsData
        }, {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        logger.info(`Batch ML prediction successful for ${productsData.length} products`);
        return response.data.predictions;
      } catch (mlError) {
        logger.warn('ML batch service unavailable, using individual predictions');
        
        // Fallback to individual predictions
        const predictions = [];
        for (const productData of productsData) {
          try {
            const prediction = await this.predictPrice(productData);
            predictions.push(prediction);
          } catch (error) {
            logger.error(`Failed to predict price for product:`, error);
            predictions.push({
              recommended_price: productData.current_price,
              confidence: 0,
              factors: ['prediction_failed'],
              method: 'no_change',
              error: error.message
            });
          }
        }
        
        return predictions;
      }
    } catch (error) {
      logger.error('Error in batch price prediction:', error);
      throw error;
    }
  }

  /**
   * Get pricing insights for analytics
   * @param {Array} products - Array of products
   * @returns {Object} Pricing insights
   */
  async getPricingInsights(products) {
    try {
      const insights = {
        totalProducts: products.length,
        averageDiscount: 0,
        riskCategories: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        categoryAnalysis: {},
        recommendations: []
      };

      let totalDiscount = 0;
      const categoryStats = {};

      for (const product of products) {
        // Calculate discount
        const discount = ((product.originalPrice - product.currentPrice) / product.originalPrice) * 100;
        totalDiscount += discount;

        // Risk categorization
        if (product.daysToExpiry <= 1) {
          insights.riskCategories.critical++;
        } else if (product.daysToExpiry <= 3) {
          insights.riskCategories.high++;
        } else if (product.daysToExpiry <= 7) {
          insights.riskCategories.medium++;
        } else {
          insights.riskCategories.low++;
        }

        // Category analysis
        if (!categoryStats[product.category]) {
          categoryStats[product.category] = {
            count: 0,
            avgPrice: 0,
            avgDiscount: 0,
            totalValue: 0
          };
        }
        
        categoryStats[product.category].count++;
        categoryStats[product.category].avgPrice += product.currentPrice;
        categoryStats[product.category].avgDiscount += discount;
        categoryStats[product.category].totalValue += product.currentPrice * product.stockLevel;
      }

      // Calculate averages
      insights.averageDiscount = totalDiscount / products.length;

      // Finalize category analysis
      Object.keys(categoryStats).forEach(category => {
        const stats = categoryStats[category];
        insights.categoryAnalysis[category] = {
          count: stats.count,
          averagePrice: stats.avgPrice / stats.count,
          averageDiscount: stats.avgDiscount / stats.count,
          totalValue: stats.totalValue
        };
      });

      // Generate recommendations
      if (insights.riskCategories.critical > 0) {
        insights.recommendations.push(`${insights.riskCategories.critical} products expire within 24 hours. Consider immediate action.`);
      }
      
      if (insights.riskCategories.high > 5) {
        insights.recommendations.push(`${insights.riskCategories.high} products expire within 3 days. Run promotional campaigns.`);
      }

      if (insights.averageDiscount < 10) {
        insights.recommendations.push('Average discount is low. Consider more aggressive pricing for perishable items.');
      }

      return insights;
    } catch (error) {
      logger.error('Error generating pricing insights:', error);
      throw error;
    }
  }

  /**
   * Health check for ML service
   * @returns {Object} Health status
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.mlServiceUrl}/health`, {
        timeout: 3000
      });
      
      return {
        status: 'healthy',
        mlService: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        fallbackEnabled: this.fallbackEnabled,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new MLService();
