import React, { useState } from 'react';
import { 
  Calendar, 
  Package2, 
  TrendingDown, 
  TrendingUp, 
  Zap,
  Edit3,
  Trash2
} from 'lucide-react';
import moment from 'moment';
import { useCurrency } from '../context/CurrencyContext';
import apiService from '../services/api';

const ProductCard = ({ product, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const { formatPrice } = useCurrency();

  const getExpiryStatusBadge = (daysToExpiry) => {
    if (daysToExpiry < 0) {
      return <span className="status-badge status-expired">Expired</span>;
    } else if (daysToExpiry <= 1) {
      return <span className="status-badge status-critical">Critical</span>;
    } else if (daysToExpiry <= 3) {
      return <span className="status-badge status-warning">Warning</span>;
    } else {
      return <span className="status-badge status-good">Good</span>;
    }
  };

  const getStockStatusColor = (stockLevel) => {
    if (stockLevel === 0) return 'text-red-600';
    if (stockLevel < 20) return 'text-orange-600';
    if (stockLevel < 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getDemandStatusColor = (demandScore) => {
    if (demandScore < 0.3) return 'text-red-600';
    if (demandScore < 0.7) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleUpdatePricing = async () => {
    try {
      setLoading(true);
      await apiService.updateProductPricing(product._id);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await apiService.deleteProduct(product._id);
        if (onUpdate) onUpdate();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {product.name}
          </h3>
          <p className="text-sm text-gray-600 capitalize">
            {product.category} • SKU: {product.sku}
          </p>
        </div>
        <div className="flex space-x-1 ml-2">
          <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
            <Edit3 className="h-4 w-4" />
          </button>
          <button 
            onClick={handleDelete}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Price Information */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900">
            {formatPrice(product.currentPrice)}
          </span>
          {product.discountPercentage > 0 && (
            <div className="flex items-center space-x-1 text-red-600">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm font-medium">
                {product.discountPercentage}% off
              </span>
            </div>
          )}
        </div>
        {product.originalPrice && product.originalPrice !== product.currentPrice && (
          <div className="text-sm text-gray-500">
            Original: <span className="line-through">{formatPrice(product.originalPrice)}</span>
          </div>
        )}
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {getExpiryStatusBadge(product.daysToExpiry)}
        <span className="status-badge bg-blue-100 text-blue-800 capitalize">
          {product.category}
        </span>
      </div>

      {/* Product Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Expires in</span>
          </div>
          <span className={`font-medium ${
            product.daysToExpiry < 0 ? 'text-red-600' :
            product.daysToExpiry <= 1 ? 'text-red-600' :
            product.daysToExpiry <= 3 ? 'text-orange-600' :
            product.daysToExpiry <= 7 ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {product.daysToExpiry < 0 
              ? `${Math.abs(product.daysToExpiry)} days ago`
              : `${product.daysToExpiry} days`
            }
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1">
            <Package2 className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Stock</span>
          </div>
          <span className={`font-medium ${getStockStatusColor(product.stockLevel)}`}>
            {product.stockLevel} units
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Demand</span>
          </div>
          <span className={`font-medium ${getDemandStatusColor(product.demandScore)}`}>
            {(product.demandScore * 100).toFixed(0)}%
          </span>
        </div>

        {product.lastPriceUpdate && (
          <div className="text-xs text-gray-500">
            Last updated: {moment(product.lastPriceUpdate).fromNow()}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={handleUpdatePricing}
          disabled={loading}
          className="btn-primary flex-1 flex items-center justify-center space-x-1 text-sm"
        >
          <Zap className={`h-4 w-4 ${loading ? 'animate-pulse' : ''}`} />
          <span>{loading ? 'Updating...' : 'AI Price'}</span>
        </button>
        
        <button className="btn-outline flex items-center justify-center px-3">
          <Edit3 className="h-4 w-4" />
        </button>
      </div>

      {/* Quick Stats Bar */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-500">Historical Sales</div>
            <div className="text-sm font-medium text-gray-900">
              {product.historicalSales || 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Days Listed</div>
            <div className="text-sm font-medium text-gray-900">
              {moment().diff(moment(product.createdAt), 'days')}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Price Changes</div>
            <div className="text-sm font-medium text-gray-900">
              {product.priceHistory?.length || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
