import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package,
  Calendar,
  BarChart3
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useCurrency } from '../context/CurrencyContext';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Analytics = () => {
  const { formatPrice } = useCurrency();
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const [analyticsResponse, productsResponse] = await Promise.all([
        apiService.getProductAnalytics(),
        apiService.getProducts({ limit: 100 })
      ]);

      setAnalytics(analyticsResponse);
      setProducts(productsResponse.products);
      
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate price trend data
  const generatePriceTrendData = () => {
    const days = parseInt(timeRange);
    const data = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Simulate price data
      const basePrice = 50;
      const variation = Math.sin(i * 0.3) * 10 + Math.random() * 5;
      
      data.push({
        date: date.toLocaleDateString(),
        averagePrice: Math.max(0, basePrice + variation),
        discountedItems: Math.floor(Math.random() * 20) + 5
      });
    }
    
    return data;
  };

  // Generate category distribution data
  const generateCategoryData = () => {
    if (!analytics?.categoryStats) return [];
    
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#84CC16'];
    
    return analytics.categoryStats.map((category, index) => ({
      name: category._id,
      value: category.count,
      color: colors[index % colors.length]
    }));
  };

  // Generate expiry analysis data
  const generateExpiryData = () => {
    const expiryCategories = [
      { name: 'Expired', count: 0, color: '#EF4444' },
      { name: 'Critical (1 day)', count: 0, color: '#F97316' },
      { name: 'Warning (2-3 days)', count: 0, color: '#F59E0B' },
      { name: 'Good (>3 days)', count: 0, color: '#10B981' }
    ];

    products.forEach(product => {
      const daysToExpiry = product.daysToExpiry;
      
      if (daysToExpiry < 0) {
        expiryCategories[0].count++;
      } else if (daysToExpiry <= 1) {
        expiryCategories[1].count++;
      } else if (daysToExpiry <= 3) {
        expiryCategories[2].count++;
      } else {
        expiryCategories[3].count++;
      }
    });

    return expiryCategories;
  };

  const priceTrendData = generatePriceTrendData();
  const categoryData = generateCategoryData();
  const expiryData = generateExpiryData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">
            Insights and trends for your dynamic pricing strategy
          </p>
        </div>
        <div className="flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="select-field"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
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
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +5% from last week
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-md">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.expiringSoon}</p>
                <p className="text-xs text-red-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12% from yesterday
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-md">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Discount</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.categoryStats?.length > 0 
                    ? Math.round(analytics.categoryStats.reduce((acc, cat) => acc + (cat.avgPrice || 0), 0) / analytics.categoryStats.length * 0.15)
                    : 0}%
                </p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  -3% from last week
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-md">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.categoryStats?.length || 0}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Active categories
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Trends */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Price Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="averagePrice" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Average Price"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Category Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Expiry Analysis */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Expiry Status
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={expiryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6">
                {expiryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Discounted Items Trend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Discounted Items
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="discountedItems" 
                stroke="#EF4444" 
                strokeWidth={2}
                name="Discounted Items"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Performance Table */}
      {analytics?.categoryStats && analytics.categoryStats.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Category Performance
          </h3>
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Category</th>
                  <th className="table-header-cell">Products</th>
                  <th className="table-header-cell">Average Price</th>
                  <th className="table-header-cell">Performance</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {analytics.categoryStats.map((category) => (
                  <tr key={category._id} className="table-row">
                    <td className="table-cell">
                      <span className="font-medium capitalize">{category._id}</span>
                    </td>
                    <td className="table-cell">{category.count}</td>
                    <td className="table-cell">{formatPrice(category.avgPrice || 0)}</td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        {Math.random() > 0.5 ? (
                          <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                        )}
                        <span className={Math.random() > 0.5 ? 'text-green-600' : 'text-red-600'}>
                          {(Math.random() * 20 - 10).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
