# Dynamic Pricing Application for Perishable Goods

A full-stack web application with integrated Machine Learning for dynamic pricing of perishable goods. The system optimizes prices based on real-time product data including expiry dates, demand, and inventory levels to maximize revenue and minimize waste.

## 🎯 Features

- **Dynamic Pricing**: AI-powered price optimization using XGBoost machine learning model
- **Real-time Dashboard**: Monitor products, pricing trends, and analytics
- **Product Management**: Complete CRUD operations for product inventory
- **Expiry Tracking**: Automatic alerts and pricing adjustments for perishable items
- **Analytics**: Comprehensive insights with charts and performance metrics
- **Fallback Pricing**: Rule-based pricing when ML service is unavailable

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React.js      │    │    Node.js       │    │   Python ML     │
│   Frontend      │◄──►│    Backend       │◄──►│   Service       │
│                 │    │   (Express)      │    │   (FastAPI)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │   MongoDB   │
                       │  Database   │
                       └─────────────┘
```

## 🛠️ Technology Stack

- **Frontend**: React.js with Tailwind CSS
- **Backend**: Node.js with Express.js and Mongoose ODM
- **Database**: MongoDB
- **ML Model**: XGBoost for price prediction (Python FastAPI service)
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React

## 📁 Project Structure

```
dynamic-pricing-app/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   └── config/         # Configuration files
│   └── package.json
├── frontend/               # React.js application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── package.json
├── ml-service/             # Python ML service
│   ├── training/           # Model training scripts
│   ├── models/             # Trained models
│   ├── main.py            # FastAPI application
│   └── requirements.txt
└── data/                   # Sample data and datasets
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- MongoDB (local or cloud instance)

### 1. Clone the Repository

```powershell
git clone <repository-url>
cd "New folder"
```

### 2. Setup Backend (Node.js)

```powershell
cd backend
npm install
```

Create `.env` file:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/dynamic_pricing
ML_SERVICE_URL=http://localhost:8000
ML_FALLBACK_ENABLED=true
LOG_LEVEL=info
```

Start the backend:
```powershell
npm run dev
```

### 3. Setup ML Service (Python)

```powershell
cd ml-service
pip install -r requirements.txt
```

Train the model and start the service:
```powershell
python training/train_model.py
python main.py
```

The ML service will be available at `http://localhost:8000`

### 4. Setup Frontend (React)

```powershell
cd frontend
npm install
```

Start the frontend:
```powershell
npm start
```

The application will be available at `http://localhost:3000`

### 5. Load Sample Data

Use the sample data in the `data/` folder to populate your database with test products.

## 📊 ML Model Details

### Input Features
- `current_price`: Current product price
- `days_to_expiry`: Days until product expires
- `stock_level`: Current inventory level
- `demand_score`: Demand indicator (0-1)
- `category`: Product category
- `historical_sales`: Past sales data
- `day_of_week`: Current day of the week

### Model Output
- `recommended_price`: Optimal price recommendation
- `confidence`: Model confidence score
- `factors`: Key factors influencing the price

### Business Logic
The model applies intelligent pricing strategies:
- **Expiry-based**: Increased discounts as expiry approaches
- **Demand-driven**: Price adjustments based on demand patterns
- **Inventory management**: Pricing to optimize stock levels
- **Category-specific**: Tailored strategies per product category

## 🎛️ API Endpoints

### Products
- `GET /api/products` - Get all products with filtering
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `PATCH /api/products/:id/price` - Update product price

### Pricing
- `POST /api/pricing/predict` - Get ML price prediction
- `POST /api/pricing/update` - Update all prices using ML
- `POST /api/pricing/update/:id` - Update single product price
- `GET /api/pricing/analysis/:id` - Get pricing analysis

## 🎨 Frontend Features

### Dashboard
- Real-time metrics and KPIs
- Product cards with quick actions
- Category overview and analytics
- Quick pricing updates

### Products Management
- Product listing with filtering and search
- Add/edit product modal
- Bulk operations
- Export functionality

### Analytics
- Price trend charts
- Category performance metrics
- Expiry status distribution
- Interactive data visualizations

### Settings
- Pricing configuration
- ML service settings
- Notification preferences
- System status monitoring

## 🔧 Configuration

### Backend Configuration
Environment variables in `.env`:
- `MONGODB_URI`: MongoDB connection string
- `ML_SERVICE_URL`: Python ML service URL
- `ML_FALLBACK_ENABLED`: Enable fallback pricing
- `PORT`: Server port

### ML Service Configuration
- Model parameters in `training/train_model.py`
- Service settings in `main.py`
- Feature engineering in training pipeline

## 🧪 Testing

### Backend Tests
```powershell
cd backend
npm test
```

### Frontend Tests
```powershell
cd frontend
npm test
```

## 📈 Usage Examples

### Adding a New Product
1. Navigate to Products page
2. Click "Add Product"
3. Fill in product details
4. Save to create the product

### Running Dynamic Pricing
1. Go to Dashboard
2. Click "Update All Prices"
3. ML model analyzes all products
4. Prices updated automatically

### Viewing Analytics
1. Visit Analytics page
2. Explore price trends
3. Analyze category performance
4. Monitor expiry status

## � Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🐛 Troubleshooting

### Common Issues

**ML Service Connection Error**
- Ensure Python service is running on port 8000
- Check ML_SERVICE_URL in backend .env

**Database Connection Failed**
- Verify MongoDB is running
- Check MONGODB_URI configuration

**Frontend Build Errors**
- Run `npm install` to update dependencies
- Check Node.js version compatibility

## � Support

For questions and support, please open an issue in the repository or contact the development team.

---

**Built with ❤️ for optimizing perishable goods pricing and reducing food waste.**
