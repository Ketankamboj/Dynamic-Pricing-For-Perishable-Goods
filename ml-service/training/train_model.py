"""
Training module for XGBoost dynamic pricing model
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
import joblib
import logging
from datetime import datetime, timedelta
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_synthetic_data(n_samples=10000):
    """
    Create synthetic training data for dynamic pricing model
    """
    logger.info(f"Creating {n_samples} synthetic data samples...")
    
    np.random.seed(42)
    random.seed(42)
    
    data = []
    
    categories = ['dairy', 'meat', 'vegetables', 'fruits', 'bakery', 'seafood', 'other']
    days_of_week = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    
    # Category-specific base prices
    category_base_prices = {
        'dairy': (2, 15),
        'meat': (5, 50),
        'vegetables': (1, 8),
        'fruits': (1, 12),
        'bakery': (2, 20),
        'seafood': (8, 60),
        'other': (1, 30)
    }
    
    for i in range(n_samples):
        # Random category
        category = random.choice(categories)
        min_price, max_price = category_base_prices[category]
        
        # Base product characteristics
        original_price = np.random.uniform(min_price, max_price)
        days_to_expiry = np.random.randint(-2, 30)  # Can be negative (expired)
        stock_level = np.random.randint(0, 500)
        demand_score = np.random.beta(2, 2)  # Beta distribution for demand score
        historical_sales = np.random.poisson(50)
        day_of_week = random.choice(days_of_week)
        
        # Calculate target price based on business logic
        target_price = calculate_target_price(
            original_price, days_to_expiry, stock_level, 
            demand_score, category, historical_sales, day_of_week
        )
        
        data.append({
            'current_price': original_price,
            'days_to_expiry': days_to_expiry,
            'stock_level': stock_level,
            'demand_score': demand_score,
            'category': category,
            'historical_sales': historical_sales,
            'day_of_week': day_of_week,
            'target_price': target_price
        })
    
    df = pd.DataFrame(data)
    logger.info(f"Created dataset with shape: {df.shape}")
    return df

def calculate_target_price(original_price, days_to_expiry, stock_level, 
                          demand_score, category, historical_sales, day_of_week):
    """
    Calculate target price based on intelligent business rules
    This simulates optimal pricing decisions with both increases and decreases
    """
    price_multiplier = 1.0
    
    # 1. EXPIRY-BASED PRICING (Primary factor for perishables)
    if days_to_expiry <= 0:
        # Expired items - deep discount to clear inventory
        price_multiplier *= np.random.uniform(0.05, 0.15)  # 85-95% discount
    elif days_to_expiry <= 1:
        # 1 day to expiry - aggressive discount
        price_multiplier *= np.random.uniform(0.20, 0.40)  # 60-80% discount
    elif days_to_expiry <= 2:
        # 2 days to expiry - significant discount
        price_multiplier *= np.random.uniform(0.40, 0.60)  # 40-60% discount
    elif days_to_expiry <= 3:
        # 3 days to expiry - moderate discount
        price_multiplier *= np.random.uniform(0.55, 0.75)  # 25-45% discount
    elif days_to_expiry <= 5:
        # 5 days to expiry - small discount
        price_multiplier *= np.random.uniform(0.75, 0.90)  # 10-25% discount
    elif days_to_expiry <= 7:
        # 1 week to expiry - minimal discount
        price_multiplier *= np.random.uniform(0.88, 0.98)  # 2-12% discount
    elif days_to_expiry <= 14:
        # 2 weeks to expiry - neutral to slight variation
        price_multiplier *= np.random.uniform(0.95, 1.05)  # Small variation
    elif days_to_expiry <= 21:
        # 3 weeks - fresh, can maintain or increase price
        price_multiplier *= np.random.uniform(0.98, 1.10)  # Slight premium possible
    else:
        # Very fresh items (>21 days) - premium pricing opportunity
        price_multiplier *= np.random.uniform(1.00, 1.15)  # Premium for freshness
    
    # 2. DEMAND-BASED PRICING (Key revenue optimization)
    if demand_score < 0.1:
        # Very low demand - significant discount needed
        price_multiplier *= np.random.uniform(0.70, 0.85)  # 15-30% discount
    elif demand_score < 0.3:
        # Low demand - moderate discount
        price_multiplier *= np.random.uniform(0.80, 0.95)  # 5-20% discount
    elif demand_score < 0.5:
        # Below average demand - small discount
        price_multiplier *= np.random.uniform(0.90, 1.00)  # 0-10% discount
    elif demand_score < 0.7:
        # Normal demand - maintain or slight increase
        price_multiplier *= np.random.uniform(0.95, 1.05)  # Small variation
    elif demand_score < 0.8:
        # Good demand - moderate premium
        price_multiplier *= np.random.uniform(1.02, 1.12)  # 2-12% premium
    elif demand_score < 0.9:
        # High demand - significant premium
        price_multiplier *= np.random.uniform(1.08, 1.20)  # 8-20% premium
    else:
        # Very high demand - maximum premium
        price_multiplier *= np.random.uniform(1.15, 1.35)  # 15-35% premium
    
    # 3. STOCK LEVEL OPTIMIZATION (Supply & Demand balance)
    stock_ratio = min(stock_level / 100, 5.0)  # Normalize and cap
    
    if stock_level > 300:
        # Excess inventory - aggressive pricing to move stock
        price_multiplier *= np.random.uniform(0.75, 0.90)  # 10-25% discount
    elif stock_level > 200:
        # High inventory - moderate discount
        price_multiplier *= np.random.uniform(0.85, 0.95)  # 5-15% discount
    elif stock_level > 100:
        # Above average - small discount
        price_multiplier *= np.random.uniform(0.92, 1.02)  # Small variation
    elif stock_level > 50:
        # Normal stock - maintain price
        price_multiplier *= np.random.uniform(0.98, 1.05)  # Small variation
    elif stock_level > 20:
        # Low stock - premium pricing
        price_multiplier *= np.random.uniform(1.05, 1.15)  # 5-15% premium
    elif stock_level > 10:
        # Very low stock - significant premium
        price_multiplier *= np.random.uniform(1.12, 1.25)  # 12-25% premium
    else:
        # Critical stock - scarcity pricing
        price_multiplier *= np.random.uniform(1.20, 1.50)  # 20-50% premium
    
    # 4. SALES VELOCITY INFLUENCE
    if historical_sales < 5:
        # Very slow movers - need discount to stimulate sales
        price_multiplier *= np.random.uniform(0.80, 0.92)  # 8-20% discount
    elif historical_sales < 20:
        # Slow movers - moderate discount
        price_multiplier *= np.random.uniform(0.90, 0.98)  # 2-10% discount
    elif historical_sales > 50:
        # Good sellers - can maintain premium
        price_multiplier *= np.random.uniform(1.02, 1.08)  # 2-8% premium
    elif historical_sales > 100:
        # Fast movers - significant premium
        price_multiplier *= np.random.uniform(1.05, 1.15)  # 5-15% premium
    elif historical_sales > 200:
        # Top performers - maximum premium
        price_multiplier *= np.random.uniform(1.10, 1.25)  # 10-25% premium
    
    # Historical sales influence
    if historical_sales < 20:
        price *= np.random.uniform(0.9, 0.95)  # Slow-moving discount
    elif historical_sales > 100:
        price *= np.random.uniform(1.0, 1.05)  # Fast-moving premium
    
    # Category-specific adjustments
    category_multipliers = {
        'dairy': np.random.uniform(0.95, 1.0),
        'meat': np.random.uniform(0.98, 1.02),
        'vegetables': np.random.uniform(0.9, 0.95),
        'fruits': np.random.uniform(0.9, 0.95),
        'bakery': np.random.uniform(0.85, 0.95),
        'seafood': np.random.uniform(1.0, 1.05),
        'other': np.random.uniform(0.95, 1.0)
    }
    price *= category_multipliers[category]
    
    # Day of week effect (weekend vs weekday)
    if day_of_week in ['saturday', 'sunday']:
        price *= np.random.uniform(1.0, 1.05)  # Weekend premium
    elif day_of_week == 'monday':
        price *= np.random.uniform(0.95, 1.0)  # Monday discount
    
    # Ensure minimum price (5% of original)
    min_price = original_price * 0.05
    price = max(price, min_price)
    
    # Add some noise
    noise = np.random.normal(1, 0.02)  # 2% noise
    price *= noise
    
    return round(price, 2)

def prepare_features(df):
    """
    Prepare features for training
    """
    logger.info("Preparing features...")
    
    # Define feature columns
    numeric_features = ['current_price', 'days_to_expiry', 'stock_level', 'demand_score', 'historical_sales']
    categorical_features = ['category', 'day_of_week']
    
    # Create preprocessing pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(drop='first', sparse_output=False), categorical_features)
        ])
    
    # Fit preprocessor and transform data
    X = df.drop('target_price', axis=1)
    y = df['target_price']
    
    preprocessor.fit(X)
    X_processed = preprocessor.transform(X)
    
    # Get feature names after preprocessing
    numeric_feature_names = numeric_features
    categorical_feature_names = preprocessor.named_transformers_['cat'].get_feature_names_out(categorical_features)
    feature_names = numeric_feature_names + list(categorical_feature_names)
    
    logger.info(f"Prepared {len(feature_names)} features: {feature_names}")
    
    return X_processed, y, preprocessor, feature_names

def train_xgboost_model(df):
    """
    Train XGBoost model for price prediction
    """
    logger.info("Training XGBoost model...")
    
    # Prepare features
    X, y, preprocessor, feature_names = prepare_features(df)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Define XGBoost model
    model = xgb.XGBRegressor(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1
    )
    
    # Train model
    logger.info("Training model...")
    model.fit(X_train, y_train)
    
    # Evaluate model
    train_pred = model.predict(X_train)
    test_pred = model.predict(X_test)
    
    train_mae = mean_absolute_error(y_train, train_pred)
    test_mae = mean_absolute_error(y_test, test_pred)
    train_rmse = np.sqrt(mean_squared_error(y_train, train_pred))
    test_rmse = np.sqrt(mean_squared_error(y_test, test_pred))
    train_r2 = r2_score(y_train, train_pred)
    test_r2 = r2_score(y_test, test_pred)
    
    logger.info(f"Training Results:")
    logger.info(f"Train MAE: {train_mae:.3f}, Test MAE: {test_mae:.3f}")
    logger.info(f"Train RMSE: {train_rmse:.3f}, Test RMSE: {test_rmse:.3f}")
    logger.info(f"Train R²: {train_r2:.3f}, Test R²: {test_r2:.3f}")
    
    # Feature importance
    feature_importance = model.feature_importances_
    feature_importance_df = pd.DataFrame({
        'feature': feature_names,
        'importance': feature_importance
    }).sort_values('importance', ascending=False)
    
    logger.info("Top 10 Feature Importances:")
    logger.info(feature_importance_df.head(10).to_string(index=False))
    
    # Cross-validation
    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='neg_mean_absolute_error')
    logger.info(f"Cross-validation MAE: {-cv_scores.mean():.3f} (+/- {cv_scores.std() * 2:.3f})")
    
    return model, preprocessor, feature_names

def save_model_and_data(model, preprocessor, feature_names, df):
    """
    Save trained model, preprocessor, and sample data
    """
    import os
    
    # Create models directory
    os.makedirs('../models', exist_ok=True)
    os.makedirs('../data', exist_ok=True)
    
    # Save model and preprocessor
    joblib.dump(model, '../models/xgboost_pricing_model.joblib')
    joblib.dump(preprocessor, '../models/preprocessor.joblib')
    joblib.dump(feature_names, '../models/feature_names.joblib')
    
    # Save sample data
    df.to_csv('../data/training_data.csv', index=False)
    
    logger.info("Model, preprocessor, and data saved successfully")

def main():
    """
    Main training function
    """
    logger.info("Starting model training pipeline...")
    
    # Create synthetic data
    df = create_synthetic_data(n_samples=15000)
    
    # Train model
    model, preprocessor, feature_names = train_xgboost_model(df)
    
    # Save everything
    save_model_and_data(model, preprocessor, feature_names, df)
    
    logger.info("Training pipeline completed successfully!")

if __name__ == "__main__":
    main()
