import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Database, 
  Zap, 
  Bell,
  Save,
  RefreshCw,
  User,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import apiService from '../services/api';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, updateProfile } = useAuth();
  const { currency, updateCurrency } = useCurrency();
  
  const [settings, setSettings] = useState({
    // Pricing Settings
    enableAutoPricing: true,
    pricingFrequency: '12',
    minimumDiscountThreshold: '5',
    maximumDiscountPercent: '70',
    
    // ML Model Settings
    mlServiceUrl: 'http://localhost:8000',
    enableFallbackPricing: true,
    confidenceThreshold: '0.7',
    
    // Notification Settings
    enableExpiryAlerts: true,
    expiryAlertDays: '3',
    enableLowStockAlerts: true,
    lowStockThreshold: '10',
    
    // System Settings
    timezone: 'UTC',
    currency: currency || 'USD',
    dateFormat: 'MM/DD/YYYY'
  });

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currency: user?.preferences?.currency || 'USD'
  });

  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        currency: user.preferences?.currency || 'USD'
      });
      setSettings(prev => ({
        ...prev,
        currency: user.preferences?.currency || 'USD'
      }));
    }
  }, [user]);

  const handleInputChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleProfileChange = (key, value) => {
    setProfileData(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const result = await updateProfile({
        name: profileData.name,
        preferences: {
          currency: profileData.currency,
          ...user.preferences
        }
      });
      
      if (result.success) {
        updateCurrency(profileData.currency);
        toast.success('Profile updated successfully');
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      // In a real app, this would save to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Settings saved:', settings);
      // toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestMLConnection = async () => {
    try {
      setTestingConnection(true);
      const response = await fetch(`${settings.mlServiceUrl}/health`);
      if (response.ok) {
        alert('ML service connection successful!');
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      alert('Failed to connect to ML service. Please check the URL and ensure the service is running.');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleExportAllData = async () => {
    try {
      if (window.confirm('Export all product data? This may take a moment.')) {
        await apiService.exportProducts('json');
        toast.success('Data export initiated');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const handleClearPriceHistory = async () => {
    if (window.confirm('Clear all price history? This action cannot be undone.')) {
      try {
        // In a real app, this would call an API endpoint
        toast.success('Price history cleared');
      } catch (error) {
        toast.error('Failed to clear price history');
      }
    }
  };

  const handleResetSettings = () => {
    if (window.confirm('Reset all settings to defaults? This action cannot be undone.')) {
      setSettings({
        enableAutoPricing: true,
        pricingFrequency: '12',
        minimumDiscountThreshold: '5',
        maximumDiscountPercent: '70',
        mlServiceUrl: 'http://localhost:8000',
        enableFallbackPricing: true,
        confidenceThreshold: '0.7',
        enableExpiryAlerts: true,
        expiryAlertDays: '3',
        enableLowStockAlerts: true,
        lowStockThreshold: '10',
        timezone: 'UTC',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY'
      });
      toast.success('Settings reset to defaults');
    }
  };

  const handleDeleteAllProducts = async () => {
    const confirmText = 'DELETE ALL PRODUCTS';
    const userInput = window.prompt(
      `This will permanently delete ALL products. Type "${confirmText}" to confirm:`
    );
    
    if (userInput === confirmText) {
      try {
        // In a real app, this would call an API endpoint
        toast.success('All products deleted');
      } catch (error) {
        toast.error('Failed to delete products');
      }
    } else if (userInput !== null) {
      toast.error('Deletion cancelled - incorrect confirmation text');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure your dynamic pricing application
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="btn-primary flex items-center space-x-2"
        >
          <Save className={`h-4 w-4 ${loading ? 'animate-pulse' : ''}`} />
          <span>{loading ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile & Pricing Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Settings */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profile Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => handleProfileChange('name', e.target.value)}
                  className="input"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  className="input bg-gray-50"
                  disabled
                  placeholder="Email cannot be changed"
                />
                <p className="text-xs text-gray-500 mt-1">Email address cannot be modified</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Preferred Currency
                </label>
                <select
                  value={profileData.currency}
                  onChange={(e) => handleProfileChange('currency', e.target.value)}
                  className="input"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="INR">INR - Indian Rupee</option>
                </select>
              </div>

              <button
                onClick={handleSaveProfile}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving Profile...' : 'Save Profile'}
              </button>
            </div>
          </div>

          {/* Pricing Settings */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Zap className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Pricing Settings</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Enable Automatic Pricing
                  </label>
                  <p className="text-sm text-gray-600">
                    Automatically update prices using ML predictions
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableAutoPricing}
                    onChange={(e) => handleInputChange('enableAutoPricing', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Pricing Update Frequency (hours)</label>
                  <select
                    value={settings.pricingFrequency}
                    onChange={(e) => handleInputChange('pricingFrequency', e.target.value)}
                    className="select-field"
                  >
                    <option value="1">Every hour</option>
                    <option value="6">Every 6 hours</option>
                    <option value="12">Every 12 hours</option>
                    <option value="24">Daily</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Minimum Discount Threshold (%)</label>
                  <input
                    type="number"
                    value={settings.minimumDiscountThreshold}
                    onChange={(e) => handleInputChange('minimumDiscountThreshold', e.target.value)}
                    min="0"
                    max="100"
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Maximum Discount Percentage (%)</label>
                  <input
                    type="number"
                    value={settings.maximumDiscountPercent}
                    onChange={(e) => handleInputChange('maximumDiscountPercent', e.target.value)}
                    min="0"
                    max="100"
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confidence Threshold</label>
                  <input
                    type="number"
                    value={settings.confidenceThreshold}
                    onChange={(e) => handleInputChange('confidenceThreshold', e.target.value)}
                    min="0"
                    max="1"
                    step="0.1"
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ML Model Settings */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Database className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">ML Model Settings</h3>
            </div>
            
            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label">ML Service URL</label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={settings.mlServiceUrl}
                    onChange={(e) => handleInputChange('mlServiceUrl', e.target.value)}
                    className="input-field flex-1"
                    placeholder="http://localhost:8000"
                  />
                  <button
                    onClick={handleTestMLConnection}
                    disabled={testingConnection}
                    className="btn-outline flex items-center space-x-1"
                  >
                    <RefreshCw className={`h-4 w-4 ${testingConnection ? 'animate-spin' : ''}`} />
                    <span>Test</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Enable Fallback Pricing
                  </label>
                  <p className="text-sm text-gray-600">
                    Use rule-based pricing when ML service is unavailable
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableFallbackPricing}
                    onChange={(e) => handleInputChange('enableFallbackPricing', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <SettingsIcon className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">System Settings</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  className="select-field"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="select-field"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (C$)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date Format</label>
                <select
                  value={settings.dateFormat}
                  onChange={(e) => handleInputChange('dateFormat', e.target.value)}
                  className="select-field"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Bell className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Expiry Alerts
                  </label>
                  <p className="text-sm text-gray-600">
                    Get notified when products are expiring
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableExpiryAlerts}
                    onChange={(e) => handleInputChange('enableExpiryAlerts', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {settings.enableExpiryAlerts && (
                <div className="form-group">
                  <label className="form-label">Alert Days Before Expiry</label>
                  <input
                    type="number"
                    value={settings.expiryAlertDays}
                    onChange={(e) => handleInputChange('expiryAlertDays', e.target.value)}
                    min="1"
                    max="30"
                    className="input-field"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Low Stock Alerts
                  </label>
                  <p className="text-sm text-gray-600">
                    Get notified when stock is running low
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableLowStockAlerts}
                    onChange={(e) => handleInputChange('enableLowStockAlerts', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {settings.enableLowStockAlerts && (
                <div className="form-group">
                  <label className="form-label">Low Stock Threshold</label>
                  <input
                    type="number"
                    value={settings.lowStockThreshold}
                    onChange={(e) => handleInputChange('lowStockThreshold', e.target.value)}
                    min="0"
                    max="100"
                    className="input-field"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="space-y-3">
              <button className="w-full btn-outline text-left">
                Export All Data
              </button>
              <button className="w-full btn-outline text-left">
                Clear Price History
              </button>
              <button className="w-full btn-outline text-left">
                Reset Settings
              </button>
              <button className="w-full btn-danger text-left">
                Delete All Products
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Backend API</span>
                <span className="status-badge status-good">Online</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">ML Service</span>
                <span className="status-badge status-good">Connected</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Database</span>
                <span className="status-badge status-good">Connected</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Backup</span>
                <span className="text-sm text-gray-900">2 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
