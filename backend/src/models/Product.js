const mongoose = require('mongoose');

/**
 * Product schema for dynamic pricing application
 */
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['dairy', 'meat', 'vegetables', 'fruits', 'bakery', 'seafood', 'other'],
    default: 'other'
  },
  currentPrice: {
    type: Number,
    required: [true, 'Current price is required'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: {
    type: Number,
    required: [true, 'Original price is required'],
    min: [0, 'Price cannot be negative']
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  stockLevel: {
    type: Number,
    required: [true, 'Stock level is required'],
    min: [0, 'Stock level cannot be negative'],
    default: 0
  },
  demandScore: {
    type: Number,
    required: [true, 'Demand score is required'],
    min: [0, 'Demand score cannot be negative'],
    max: [1, 'Demand score cannot exceed 1'],
    default: 0.5
  },
  historicalSales: {
    type: Number,
    default: 0,
    min: [0, 'Historical sales cannot be negative']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  imageUrl: {
    type: String,
    default: ''
  },
  supplier: {
    type: String,
    trim: true,
    maxlength: [100, 'Supplier name cannot exceed 100 characters']
  },
  sku: {
    type: String,
    unique: true,
    required: [true, 'SKU is required'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastPriceUpdate: {
    type: Date,
    default: Date.now
  },
  priceHistory: [{
    price: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      enum: ['manual', 'ml_prediction', 'promotional', 'expiry_based'],
      default: 'manual'
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for days to expiry
productSchema.virtual('daysToExpiry').get(function() {
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual field for expiry status
productSchema.virtual('expiryStatus').get(function() {
  const days = this.daysToExpiry;
  if (days < 0) return 'expired';
  if (days <= 1) return 'critical';
  if (days <= 3) return 'warning';
  return 'good';
});

// Virtual field for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice === 0) return 0;
  return Math.round(((this.originalPrice - this.currentPrice) / this.originalPrice) * 100);
});

// Index for efficient queries
productSchema.index({ category: 1, expiryDate: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ isActive: 1 });

// Pre-save middleware to update lastPriceUpdate when price changes
productSchema.pre('save', function(next) {
  if (this.isModified('currentPrice')) {
    this.lastPriceUpdate = new Date();
    
    // Add to price history
    this.priceHistory.push({
      price: this.currentPrice,
      timestamp: new Date(),
      reason: 'manual' // This can be overridden when calling save
    });
    
    // Keep only last 10 price history entries
    if (this.priceHistory.length > 10) {
      this.priceHistory = this.priceHistory.slice(-10);
    }
  }
  next();
});

// Static method to find products expiring soon
productSchema.statics.findExpiringSoon = function(days = 3) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  
  return this.find({
    expiryDate: { $lte: expiryDate },
    isActive: true
  });
};

// Static method to find products by category
productSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true });
};

// Instance method to update price with reason
productSchema.methods.updatePrice = function(newPrice, reason = 'manual') {
  this.currentPrice = newPrice;
  this.lastPriceUpdate = new Date();
  
  this.priceHistory.push({
    price: newPrice,
    timestamp: new Date(),
    reason
  });
  
  // Keep only last 10 price history entries
  if (this.priceHistory.length > 10) {
    this.priceHistory = this.priceHistory.slice(-10);
  }
  
  return this.save();
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
