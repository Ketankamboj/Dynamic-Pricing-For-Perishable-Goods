import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import apiService from '../services/api';

const ProductModal = ({ product, onClose, onSave }) => {
  const { getCurrencySymbol, currency, convertPrice } = useCurrency();
  const [formData, setFormData] = useState({
    name: '',
    category: 'other',
    currentPrice: '',
    originalPrice: '',
    expiryDate: '',
    stockLevel: '',
    demandScore: '0.5',
    historicalSales: '0',
    description: '',
    sku: '',
    supplier: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const categories = [
    { value: 'dairy', label: 'Dairy' },
    { value: 'meat', label: 'Meat' },
    { value: 'vegetables', label: 'Vegetables' },
    { value: 'fruits', label: 'Fruits' },
    { value: 'bakery', label: 'Bakery' },
    { value: 'seafood', label: 'Seafood' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    if (product) {
      // Convert stored USD prices to current currency for display
      const displayCurrentPrice = convertPrice(product.currentPrice || 0, 'USD', currency);
      const displayOriginalPrice = convertPrice(product.originalPrice || 0, 'USD', currency);
      
      setFormData({
        name: product.name || '',
        category: product.category || 'other',
        currentPrice: displayCurrentPrice.toFixed(2),
        originalPrice: displayOriginalPrice.toFixed(2),
        expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '',
        stockLevel: product.stockLevel?.toString() || '',
        demandScore: product.demandScore?.toString() || '0.5',
        historicalSales: product.historicalSales?.toString() || '0',
        description: product.description || '',
        sku: product.sku || '',
        supplier: product.supplier || ''
      });
    } else {
      // Generate a random SKU for new products
      const randomSku = 'SKU-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      setFormData(prev => ({ ...prev, sku: randomSku }));
    }
  }, [product, convertPrice, currency]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }

    if (!formData.currentPrice || parseFloat(formData.currentPrice) <= 0) {
      newErrors.currentPrice = 'Current price must be greater than 0';
    }

    if (!formData.originalPrice || parseFloat(formData.originalPrice) <= 0) {
      newErrors.originalPrice = 'Original price must be greater than 0';
    }

    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required';
    }

    if (!formData.stockLevel || parseInt(formData.stockLevel) < 0) {
      newErrors.stockLevel = 'Stock level must be 0 or greater';
    }

    const demandScore = parseFloat(formData.demandScore);
    if (isNaN(demandScore) || demandScore < 0 || demandScore > 1) {
      newErrors.demandScore = 'Demand score must be between 0 and 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Convert prices from current currency to USD for storage
      const currentPriceUSD = convertPrice(parseFloat(formData.currentPrice), currency, 'USD');
      const originalPriceUSD = convertPrice(parseFloat(formData.originalPrice), currency, 'USD');
      
      const payload = {
        ...formData,
        currentPrice: currentPriceUSD,
        originalPrice: originalPriceUSD,
        stockLevel: parseInt(formData.stockLevel),
        demandScore: parseFloat(formData.demandScore),
        historicalSales: parseFloat(formData.historicalSales) || 0
      };

      if (product) {
        await apiService.updateProduct(product._id, payload);
      } else {
        await apiService.createProduct(payload);
      }

      onSave();
    } catch (error) {
      console.error('Error saving product:', error);
      
      // Handle validation errors from backend
      if (error.response?.data?.errors) {
        const backendErrors = {};
        error.response.data.errors.forEach(err => {
          backendErrors[err.path || err.param] = err.msg;
        });
        setErrors(backendErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Enter product name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">SKU *</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                className={`input-field ${errors.sku ? 'border-red-500' : ''}`}
                placeholder="Product SKU"
              />
              {errors.sku && <p className="text-red-500 text-sm mt-1">{errors.sku}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="select-field"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Supplier</label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Supplier name"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Current Price * ({getCurrencySymbol()})</label>
              <input
                type="number"
                name="currentPrice"
                value={formData.currentPrice}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`input-field ${errors.currentPrice ? 'border-red-500' : ''}`}
                placeholder="0.00"
              />
              {errors.currentPrice && <p className="text-red-500 text-sm mt-1">{errors.currentPrice}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Original Price * ({getCurrencySymbol()})</label>
              <input
                type="number"
                name="originalPrice"
                value={formData.originalPrice}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`input-field ${errors.originalPrice ? 'border-red-500' : ''}`}
                placeholder="0.00"
              />
              {errors.originalPrice && <p className="text-red-500 text-sm mt-1">{errors.originalPrice}</p>}
            </div>
          </div>

          {/* Inventory & Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Expiry Date *</label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                className={`input-field ${errors.expiryDate ? 'border-red-500' : ''}`}
              />
              {errors.expiryDate && <p className="text-red-500 text-sm mt-1">{errors.expiryDate}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Stock Level *</label>
              <input
                type="number"
                name="stockLevel"
                value={formData.stockLevel}
                onChange={handleInputChange}
                min="0"
                className={`input-field ${errors.stockLevel ? 'border-red-500' : ''}`}
                placeholder="0"
              />
              {errors.stockLevel && <p className="text-red-500 text-sm mt-1">{errors.stockLevel}</p>}
            </div>
          </div>

          {/* Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Demand Score (0-1)</label>
              <input
                type="number"
                name="demandScore"
                value={formData.demandScore}
                onChange={handleInputChange}
                step="0.1"
                min="0"
                max="1"
                className={`input-field ${errors.demandScore ? 'border-red-500' : ''}`}
                placeholder="0.5"
              />
              {errors.demandScore && <p className="text-red-500 text-sm mt-1">{errors.demandScore}</p>}
              <p className="text-xs text-gray-500 mt-1">0 = Low demand, 1 = High demand</p>
            </div>

            <div className="form-group">
              <label className="form-label">Historical Sales</label>
              <input
                type="number"
                name="historicalSales"
                value={formData.historicalSales}
                onChange={handleInputChange}
                min="0"
                className="input-field"
                placeholder="0"
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className="input-field"
              placeholder="Product description (optional)"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
