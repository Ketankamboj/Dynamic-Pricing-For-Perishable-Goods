import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Currency conversion rates (in a real app, this would come from an API)
const exchangeRates = {
  USD: 1,
  INR: 83.12 // 1 USD = 83.12 INR (example rate)
};

// Currency context
const CurrencyContext = createContext();

// Provider component
export const CurrencyProvider = ({ children }) => {
  const { user } = useAuth();
  const [currency, setCurrency] = useState('INR'); // Default to INR
  const [rates, setRates] = useState(exchangeRates);

  // Update currency when user preferences change
  useEffect(() => {
    if (user?.preferences?.currency) {
      setCurrency(user.preferences.currency);
    }
  }, [user]);

  // Format price based on currency (assumes input price is in USD)
  const formatPrice = (priceInUSD, targetCurrency = currency) => {
    if (!priceInUSD && priceInUSD !== 0) return '0.00';
    
    const convertedPrice = convertPrice(priceInUSD, 'USD', targetCurrency);
    
    if (targetCurrency === 'INR') {
      return `₹${convertedPrice.toLocaleString('en-IN', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    } else {
      return `$${convertedPrice.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    }
  };

  // Convert price between currencies
  const convertPrice = (amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return amount;
    
    // Convert to USD first, then to target currency
    const usdAmount = amount / rates[fromCurrency];
    return usdAmount * rates[toCurrency];
  };

  // Get currency symbol
  const getCurrencySymbol = (targetCurrency = currency) => {
    return targetCurrency === 'INR' ? '₹' : '$';
  };

  // Get currency code
  const getCurrencyCode = () => currency;

  // Update currency
  const updateCurrency = (newCurrency) => {
    setCurrency(newCurrency);
  };

  // Calculate percentage change between two prices
  const calculatePriceChange = (oldPrice, newPrice, targetCurrency = currency) => {
    const oldConverted = convertPrice(oldPrice, 'USD', targetCurrency);
    const newConverted = convertPrice(newPrice, 'USD', targetCurrency);
    
    if (oldConverted === 0) return 0;
    return ((newConverted - oldConverted) / oldConverted) * 100;
  };

  // Format percentage
  const formatPercentage = (percentage) => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  };

  const value = {
    currency,
    rates,
    formatPrice,
    convertPrice,
    getCurrencySymbol,
    getCurrencyCode,
    updateCurrency,
    calculatePriceChange,
    formatPercentage
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

// Custom hook to use currency context
export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export default CurrencyContext;
