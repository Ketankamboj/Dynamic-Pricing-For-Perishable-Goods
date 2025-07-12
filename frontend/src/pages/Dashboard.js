import React, { useState, useEffect } from 'react';
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import apiService from '../services/api';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingPrices, setUpdatingPrices] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load products and analytics in parallel
      const [productsResponse, analyticsResponse] = await Promise.all([
        apiService.getProducts({ limit: 12, sortBy: 'expiryDate', sortOrder: 'asc' }),
        apiService.getProductAnalytics()
      ]);

      setProducts(productsResponse.products);
      setAnalytics(analyticsResponse);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAllPrices = async () => {
    try {
      setUpdatingPrices(true);
      await apiService.updateAllPrices();
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error updating prices:', error);
    } finally {
      setUpdatingPrices(false);
    }
  };

  const getExpiryStatusColor = (daysToExpiry) => {
    if (daysToExpiry < 0) return 'text-gray-500';
    if (daysToExpiry <= 1) return 'text-red-600';
    if (daysToExpiry <= 3) return 'text-orange-600';
    if (daysToExpiry <= 7) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Dynamic pricing overview and quick actions
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadDashboardData}
            className="btn-outline flex items-center space-x-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleUpdateAllPrices}
            className="btn-primary flex items-center space-x-2"
            disabled={updatingPrices}
          >
            <Zap className={`h-4 w-4 ${updatingPrices ? 'animate-pulse' : ''}`} />
            <span>{updatingPrices ? 'Updating...' : 'Update All Prices'}</span>
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-md">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalProducts}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-md">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.expiringSoon}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-md">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.expired}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-md">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.categoryStats?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Products */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Products Requiring Attention
        </h2>
        
        {products.length === 0 ? (
          <div className="card text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Add some products to get started with dynamic pricing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard 
                key={product._id} 
                product={product}
                onUpdate={loadDashboardData}
              />
            ))}
          </div>
        )}
      </div>

      {/* Category Analytics */}
      {analytics?.categoryStats && analytics.categoryStats.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Category Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.categoryStats.map((category) => (
              <div key={category._id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900 capitalize">
                    {category._id}
                  </h4>
                  <span className="text-sm text-gray-600">
                    {category.count} items
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Avg Price: {formatPrice(category.avgPrice || 0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
