import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * API service for communicating with the backend
 */
class ApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        const message = error.response?.data?.message || error.response?.data?.error || error.message || 'An error occurred';
        toast.error(message);
        return Promise.reject(error);
      }
    );
  }

  // Product API methods
  async getProducts(params = {}) {
    try {
      const response = await this.api.get('/products', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getProduct(id) {
    try {
      const response = await this.api.get(`/products/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async createProduct(productData) {
    try {
      const response = await this.api.post('/products', productData);
      toast.success('Product created successfully');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateProduct(id, productData) {
    try {
      const response = await this.api.put(`/products/${id}`, productData);
      toast.success('Product updated successfully');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteProduct(id) {
    try {
      const response = await this.api.delete(`/products/${id}`);
      toast.success('Product deleted successfully');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateProductPrice(id, price, reason = 'manual') {
    try {
      const response = await this.api.patch(`/products/${id}/price`, { price, reason });
      toast.success('Price updated successfully');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getProductAnalytics() {
    try {
      const response = await this.api.get('/products/analytics/summary');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Pricing API methods
  async predictPrice(productId) {
    try {
      const response = await this.api.post('/pricing/predict', { productId });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateAllPrices() {
    try {
      const response = await this.api.post('/pricing/update');
      toast.success(`Pricing update completed: ${response.data.summary.updated} products updated`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateProductPricing(id) {
    try {
      const response = await this.api.post(`/pricing/update/${id}`);
      toast.success('Product pricing updated using ML model');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getPricingAnalysis(id) {
    try {
      const response = await this.api.get(`/pricing/analysis/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getPricingStrategies() {
    try {
      const response = await this.api.get('/pricing/strategies');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.api.get('/health');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Export products
  async exportProducts(format = 'csv', category = null) {
    try {
      console.log('API exportProducts called with:', { format, category });
      
      const params = new URLSearchParams();
      params.append('format', format);
      if (category) {
        params.append('category', category);
      }

      const url = `/products/export?${params.toString()}`;
      console.log('Export URL:', url);

      const response = await this.api.get(url, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      console.log('Export response received:', response.status);

      if (format === 'csv') {
        // Create download link for CSV
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `products-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // Create download link for JSON
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `products-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      toast.success(`Products exported successfully as ${format.toUpperCase()}`);
      return true;
    } catch (error) {
      toast.error('Failed to export products');
      throw error;
    }
  }

  // HTTP methods with auth
  async get(url, config = {}) {
    return this.api.get(url, config);
  }

  async post(url, data = {}, config = {}) {
    return this.api.post(url, data, config);
  }

  async put(url, data = {}, config = {}) {
    return this.api.put(url, data, config);
  }

  async delete(url, config = {}) {
    return this.api.delete(url, config);
  }
}

const apiService = new ApiService();
export default apiService;
