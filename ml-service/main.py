"""
FastAPI ML Service for Dynamic Pricing
Provides price prediction endpoints using XGBoost model
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import numpy as np
import pandas as pd
import joblib
import logging
from datetime import datetime
import os
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Dynamic Pricing ML Service",
    description="Machine Learning service for dynamic pricing of perishable goods",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and preprocessor
model = None
preprocessor = None
feature_names = None

class ProductData(BaseModel):
    """Product data model for price prediction"""
    current_price: float = Field(..., gt=0, description="Current price of the product")
    days_to_expiry: int = Field(..., description="Days until product expires")
    stock_level: int = Field(..., ge=0, description="Current stock level")
    demand_score: float = Field(..., ge=0, le=1, description="Demand score between 0 and 1")
    category: str = Field(..., description="Product category")
    historical_sales: float = Field(default=0, ge=0, description="Historical sales data")
    day_of_week: str = Field(default="monday", description="Day of the week")

class BatchPredictRequest(BaseModel):
    """Batch prediction request model"""
    products: List[ProductData]

class PredictionResponse(BaseModel):
    """Price prediction response model"""
    recommended_price: float
    confidence: Optional[float] = None
    factors: Optional[List[str]] = None
    method: str = "ml_model"
    timestamp: str

class BatchPredictionResponse(BaseModel):
    """Batch prediction response model"""
    predictions: List[PredictionResponse]
    total_processed: int
    timestamp: str

def load_model():
    """Load the trained model and preprocessor"""
    global model, preprocessor, feature_names
    
    try:
        model_path = Path("models/xgboost_pricing_model.joblib")
        preprocessor_path = Path("models/preprocessor.joblib")
        features_path = Path("models/feature_names.joblib")
        
        if model_path.exists() and preprocessor_path.exists():
            model = joblib.load(model_path)
            preprocessor = joblib.load(preprocessor_path)
            
            if features_path.exists():
                feature_names = joblib.load(features_path)
            else:
                # Default feature names if file doesn't exist
                feature_names = [
                    'current_price', 'days_to_expiry', 'stock_level', 'demand_score',
                    'historical_sales', 'category_bakery', 'category_dairy',
                    'category_fruits', 'category_meat', 'category_other',
                    'category_seafood', 'category_vegetables', 'day_of_week_friday',
                    'day_of_week_monday', 'day_of_week_saturday', 'day_of_week_sunday',
                    'day_of_week_thursday', 'day_of_week_tuesday', 'day_of_week_wednesday'
                ]
            
            logger.info("Model and preprocessor loaded successfully")
            return True
        else:
            logger.warning("Model files not found. Training new model...")
            train_model()
            return True
            
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        return False

def preprocess_data(product_data: ProductData) -> np.ndarray:
    """Preprocess product data for model prediction"""
    try:
        # Create DataFrame with single row
        data = pd.DataFrame([{
            'current_price': product_data.current_price,
            'days_to_expiry': product_data.days_to_expiry,
            'stock_level': product_data.stock_level,
            'demand_score': product_data.demand_score,
            'historical_sales': product_data.historical_sales,
            'category': product_data.category.lower(),
            'day_of_week': product_data.day_of_week.lower()
        }])
        
        # Apply preprocessing pipeline
        if preprocessor is not None:
            processed_data = preprocessor.transform(data)
        else:
            # Manual preprocessing if no preprocessor available
            processed_data = manual_preprocessing(data)
        
        return processed_data
        
    except Exception as e:
        logger.error(f"Error preprocessing data: {e}")
        raise HTTPException(status_code=400, detail=f"Data preprocessing error: {e}")

def manual_preprocessing(data: pd.DataFrame) -> np.ndarray:
    """Manual preprocessing when preprocessor is not available"""
    # Categories and days
    categories = ['bakery', 'dairy', 'fruits', 'meat', 'other', 'seafood', 'vegetables']
    days = ['friday', 'monday', 'saturday', 'sunday', 'thursday', 'tuesday', 'wednesday']
    
    # Initialize result array
    result = []
    
    for _, row in data.iterrows():
        features = [
            row['current_price'],
            row['days_to_expiry'],
            row['stock_level'],
            row['demand_score'],
            row['historical_sales']
        ]
        
        # One-hot encode category
        for cat in categories:
            features.append(1 if row['category'] == cat else 0)
        
        # One-hot encode day of week
        for day in days:
            features.append(1 if row['day_of_week'] == day else 0)
        
        result.append(features)
    
    return np.array(result)

def calculate_rule_based_price(product_data: ProductData) -> float:
    """Calculate price using enhanced rule-based approach with intelligent price optimization"""
    base_price = product_data.current_price
    price_multiplier = 1.0
    
    # 1. EXPIRY-BASED PRICING (Primary factor)
    if product_data.days_to_expiry <= 0:
        price_multiplier *= 0.05  # 95% discount for expired items
    elif product_data.days_to_expiry <= 1:
        price_multiplier *= 0.25  # 75% discount - urgent clearance
    elif product_data.days_to_expiry <= 2:
        price_multiplier *= 0.45  # 55% discount - significant markdown
    elif product_data.days_to_expiry <= 3:
        price_multiplier *= 0.60  # 40% discount - moderate markdown
    elif product_data.days_to_expiry <= 5:
        price_multiplier *= 0.75  # 25% discount - encouraging sales
    elif product_data.days_to_expiry <= 7:
        price_multiplier *= 0.85  # 15% discount - slight urgency
    elif product_data.days_to_expiry <= 14:
        price_multiplier *= 0.95  # 5% discount - fresh but moving
    elif product_data.days_to_expiry <= 21:
        price_multiplier *= 1.0   # No expiry adjustment
    else:
        # Very fresh items (>21 days) can command premium
        price_multiplier *= 1.05  # 5% premium for very fresh items
    
    # 2. DEMAND-BASED PRICING (Key revenue driver)
    if product_data.demand_score < 0.1:
        price_multiplier *= 0.75  # 25% discount for very low demand
    elif product_data.demand_score < 0.3:
        price_multiplier *= 0.85  # 15% discount for low demand
    elif product_data.demand_score < 0.5:
        price_multiplier *= 0.95  # 5% discount for below average demand
    elif product_data.demand_score < 0.7:
        price_multiplier *= 1.0   # No adjustment for normal demand
    elif product_data.demand_score < 0.8:
        price_multiplier *= 1.08  # 8% premium for good demand
    elif product_data.demand_score < 0.9:
        price_multiplier *= 1.15  # 15% premium for high demand
    else:
        price_multiplier *= 1.25  # 25% premium for very high demand
    
    # 3. STOCK LEVEL OPTIMIZATION (Inventory management)
    if product_data.stock_level > 300:
        price_multiplier *= 0.80  # 20% discount for excess inventory
    elif product_data.stock_level > 200:
        price_multiplier *= 0.90  # 10% discount for high inventory
    elif product_data.stock_level > 100:
        price_multiplier *= 0.96  # 4% discount for above normal stock
    elif product_data.stock_level > 50:
        price_multiplier *= 1.0   # No adjustment for normal stock
    elif product_data.stock_level > 20:
        price_multiplier *= 1.08  # 8% premium for moderate stock
    elif product_data.stock_level > 10:
        price_multiplier *= 1.15  # 15% premium for low stock
    else:
        price_multiplier *= 1.30  # 30% premium for very low stock (scarcity pricing)
    
    # 4. SALES VELOCITY OPTIMIZATION
    if product_data.historical_sales < 5:
        price_multiplier *= 0.85  # 15% discount for very slow movers
    elif product_data.historical_sales < 20:
        price_multiplier *= 0.92  # 8% discount for slow movers
    elif product_data.historical_sales > 50:
        price_multiplier *= 1.05  # 5% premium for good sellers
    elif product_data.historical_sales > 100:
        price_multiplier *= 1.10  # 10% premium for fast movers
    elif product_data.historical_sales > 200:
        price_multiplier *= 1.15  # 15% premium for top performers
    
    # 5. CATEGORY-SPECIFIC ADJUSTMENTS
    category_adjustments = {
        'meat': 1.05,      # Premium category
        'seafood': 1.08,   # High-value category
        'dairy': 1.02,     # Stable demand
        'fruits': 0.98,    # Price-sensitive
        'vegetables': 0.96, # Highly price-sensitive
        'bakery': 0.95,    # Discount-driven
        'other': 1.0       # Neutral
    }
    
    category_multiplier = category_adjustments.get(product_data.category.lower(), 1.0)
    price_multiplier *= category_multiplier
    
    # 6. INTELLIGENT PRICE BOUNDS
    # Only apply aggressive discounts if absolutely necessary (expired + excess stock)
    if product_data.days_to_expiry > 0 and product_data.demand_score > 0.5:
        # For fresh products with decent demand, don't go below 70% of original
        min_multiplier = 0.70
        price_multiplier = max(price_multiplier, min_multiplier)
    
    # Cap maximum premium at 50% unless it's a true scarcity situation
    if product_data.stock_level > 5:  # Not truly scarce
        max_multiplier = 1.35
        price_multiplier = min(price_multiplier, max_multiplier)
    
    # Calculate final price
    final_price = base_price * price_multiplier
    
    # Ensure minimum viable price (5% of original to cover basic costs)
    min_price = product_data.current_price * 0.05
    
    return max(final_price, min_price)

def train_model():
    """Train a new model with synthetic data"""
    logger.info("Training new model with synthetic data...")
    
    try:
        from training.train_model import create_synthetic_data, train_xgboost_model
        
        # Create synthetic training data
        df = create_synthetic_data(n_samples=10000)
        
        # Train model
        trained_model, trained_preprocessor, features = train_xgboost_model(df)
        
        # Save model and preprocessor
        os.makedirs("models", exist_ok=True)
        joblib.dump(trained_model, "models/xgboost_pricing_model.joblib")
        joblib.dump(trained_preprocessor, "models/preprocessor.joblib")
        joblib.dump(features, "models/feature_names.joblib")
        
        # Update global variables
        global model, preprocessor, feature_names
        model = trained_model
        preprocessor = trained_preprocessor
        feature_names = features
        
        logger.info("Model training completed successfully")
        
    except Exception as e:
        logger.error(f"Error training model: {e}")
        raise

@app.on_event("startup")
async def startup_event():
    """Initialize the ML service"""
    logger.info("Starting ML service...")
    if not load_model():
        logger.error("Failed to load model")
        raise RuntimeError("Model loading failed")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "preprocessor_loaded": preprocessor is not None,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/predict-price", response_model=PredictionResponse)
async def predict_price(product_data: ProductData):
    """Predict optimal price for a single product"""
    try:
        if model is None:
            # Use rule-based pricing as fallback
            recommended_price = calculate_rule_based_price(product_data)
            return PredictionResponse(
                recommended_price=round(recommended_price, 2),
                confidence=0.6,
                factors=["rule_based_fallback"],
                method="rule_based",
                timestamp=datetime.now().isoformat()
            )
        
        # Preprocess data
        processed_data = preprocess_data(product_data)
        
        # Make prediction
        prediction = model.predict(processed_data)[0]
        
        # Ensure minimum price (10% of current price)
        min_price = product_data.current_price * 0.1
        recommended_price = max(prediction, min_price)
        
        # Calculate confidence based on model (simplified)
        confidence = min(0.95, max(0.6, 1.0 - abs(prediction - product_data.current_price) / product_data.current_price))
        
        # Determine factors affecting pricing
        factors = []
        
        # Expiry factors
        if product_data.days_to_expiry <= 0:
            factors.append("expired_clearance")
        elif product_data.days_to_expiry <= 1:
            factors.append("critical_expiry")
        elif product_data.days_to_expiry <= 3:
            factors.append("expiry_proximity")
        elif product_data.days_to_expiry <= 7:
            factors.append("short_shelf_life")
        
        # Stock level factors
        if product_data.stock_level > 200:
            factors.append("excess_inventory")
        elif product_data.stock_level > 100:
            factors.append("high_stock")
        elif product_data.stock_level < 20:
            factors.append("low_stock")
        elif product_data.stock_level < 10:
            factors.append("critical_stock")
        
        # Demand factors
        if product_data.demand_score < 0.2:
            factors.append("low_demand")
        elif product_data.demand_score > 0.8:
            factors.append("high_demand")
        elif product_data.demand_score > 0.9:
            factors.append("peak_demand")
        
        # Sales velocity factors
        if product_data.historical_sales < 10:
            factors.append("slow_moving")
        elif product_data.historical_sales > 100:
            factors.append("fast_moving")
        
        # Combined factors
        if product_data.days_to_expiry <= 3 and product_data.stock_level > 100:
            factors.append("urgent_clearance_needed")
        if product_data.stock_level < 20 and product_data.demand_score > 0.7:
            factors.append("scarcity_premium")
        
        return PredictionResponse(
            recommended_price=round(recommended_price, 2),
            confidence=round(confidence, 3),
            factors=factors,
            method="ml_model",
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error in price prediction: {e}")
        # Fallback to rule-based pricing
        recommended_price = calculate_rule_based_price(product_data)
        return PredictionResponse(
            recommended_price=round(recommended_price, 2),
            confidence=0.5,
            factors=["error_fallback"],
            method="rule_based_fallback",
            timestamp=datetime.now().isoformat()
        )

@app.post("/batch-predict", response_model=BatchPredictionResponse)
async def batch_predict(request: BatchPredictRequest):
    """Predict optimal prices for multiple products"""
    try:
        predictions = []
        
        for product_data in request.products:
            try:
                # Get individual prediction
                prediction = await predict_price(product_data)
                predictions.append(prediction)
            except Exception as e:
                logger.error(f"Error predicting price for product: {e}")
                # Add fallback prediction
                fallback_price = calculate_rule_based_price(product_data)
                predictions.append(PredictionResponse(
                    recommended_price=round(fallback_price, 2),
                    confidence=0.4,
                    factors=["batch_error_fallback"],
                    method="rule_based_fallback",
                    timestamp=datetime.now().isoformat()
                ))
        
        return BatchPredictionResponse(
            predictions=predictions,
            total_processed=len(predictions),
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error in batch prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {e}")

@app.get("/model-info")
async def get_model_info():
    """Get information about the loaded model"""
    return {
        "model_type": "XGBoost" if model else "None",
        "model_loaded": model is not None,
        "preprocessor_loaded": preprocessor is not None,
        "feature_names": feature_names if feature_names else [],
        "total_features": len(feature_names) if feature_names else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
