import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download,
  RefreshCw
} from 'lucide-react';
import apiService from '../services/api';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    expiringSoon: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'dairy', label: 'Dairy' },
    { value: 'meat', label: 'Meat' },
    { value: 'vegetables', label: 'Vegetables' },
    { value: 'fruits', label: 'Fruits' },
    { value: 'bakery', label: 'Bakery' },
    { value: 'seafood', label: 'Seafood' },
    { value: 'other', label: 'Other' }
  ];

  const sortOptions = [
    { value: 'createdAt', label: 'Date Created' },
    { value: 'name', label: 'Name' },
    { value: 'currentPrice', label: 'Price' },
    { value: 'expiryDate', label: 'Expiry Date' },
    { value: 'stockLevel', label: 'Stock Level' }
  ];

  useEffect(() => {
    loadProducts();
  }, [filters]);

  const loadProducts = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 12,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      const response = await apiService.getProducts(params);
      setProducts(response.products);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleProductSave = async () => {
    setShowModal(false);
    setEditingProduct(null);
    await loadProducts();
  };

  const handleExport = async (format = 'csv') => {
    try {
      setExportLoading(true);
      console.log('Starting export with format:', format, 'category:', filters.category);
      
      const result = await apiService.exportProducts(format, filters.category || null);
      console.log('Export result:', result);
      
      // Don't show success toast here since apiService already shows it
    } catch (error) {
      console.error('Export error:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(`Failed to export products: ${error.response?.data?.error || error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handlePageChange = (page) => {
    loadProducts(page);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">
            Manage your product inventory and pricing
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => loadProducts()}
            className="btn-outline flex items-center space-x-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="btn-outline flex items-center space-x-2"
            disabled={exportLoading}
          >
            <Download className={`h-4 w-4 ${exportLoading ? 'animate-pulse' : ''}`} />
            <span>{exportLoading ? 'Exporting...' : 'Export'}</span>
          </button>
          <button
            onClick={handleCreateProduct}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="form-label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products or SKU..."
                className="input-field pl-10"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="form-label">Category</label>
            <select
              className="select-field"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="form-label">Sort By</label>
            <select
              className="select-field"
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="form-label">Order</label>
            <select
              className="select-field"
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => handleFilterChange('expiringSoon', filters.expiringSoon === '3' ? '' : '3')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filters.expiringSoon === '3'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Expiring Soon (3 days)
          </button>
          <button
            onClick={() => handleFilterChange('expiringSoon', filters.expiringSoon === '7' ? '' : '7')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filters.expiringSoon === '7'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Expiring This Week
          </button>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      ) : products.length === 0 ? (
        <div className="card text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Filter className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your filters or add a new product to get started.
            </p>
            <button
              onClick={handleCreateProduct}
              className="btn-primary"
            >
              Add Your First Product
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onUpdate={loadProducts}
                onEdit={() => handleEditProduct(product)}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="btn-outline"
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-600">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="btn-outline"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={editingProduct}
          onClose={handleModalClose}
          onSave={handleProductSave}
        />
      )}
    </div>
  );
};

export default Products;
