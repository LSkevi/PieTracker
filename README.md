# 🥧 PieTracker - Beautiful Expense Tracking App

> A modern, elegant expense tracking web application with beautiful visualizations and multi-currency support

[![React](https://img.shields.io/badge/React-19.1.1-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.7+-green?logo=python)](https://python.org/)

## 🚀 Live Demo

- **Frontend**: [https://pietracker.vercel.app](https://pietracker.vercel.app)
- **Backend API**: [https://pietracker-backend.onrender.com](https://pietracker-backend.onrender.com)

## ✨ Features

- 🎨 **Beautiful UI**: Modern, responsive design with elegant color schemes
- 📊 **Interactive Charts**: Dynamic pie charts showing expense breakdowns by category
- � **Multi-Currency**: Support for 10+ currencies with real-time conversion
- � **Monthly Tracking**: View and compare expenses across different months
- 🏷️ **Smart Categories**: Pre-defined categories with the ability to add custom ones
- 🔄 **Real-time Updates**: Instant chart updates when adding new expenses
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- 🌙 **Theme Toggle**: Light and dark mode support
- 💾 **Data Persistence**: Local JSON storage with easy database migration path

## 🚀 Quick Start

### Prerequisites

- **Python 3.7+** (tested with Python 3.13)
- **Node.js 16+**
- **npm** or **yarn**

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/PieTracker.git
   cd PieTracker
   ```

2. **Set up the backend**

   ```bash
   cd backend

   # Create virtual environment
   python -m venv venv

   # Activate virtual environment
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate

   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the backend server**

   ```bash
   cd backend
   python main.py
   ```

   Backend will be available at `http://localhost:8000`

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will be available at `http://localhost:5173`

## 📱 Usage

### Adding Expenses

1. Fill out the expense form with amount, category, and description
2. Select your preferred currency and date
3. Click "Add Expense" to save
4. Watch the pie chart update in real-time!

### Viewing Data

- **Monthly View**: Use the month/year selectors to browse different periods
- **Currency Conversion**: Switch between supported currencies for display
- **Category Breakdown**: View detailed spending by category in the pie chart
- **Expense List**: See all individual expenses with the ability to delete

### Custom Categories

- Add new expense categories on-the-fly
- Categories are automatically saved and persist across sessions

## �️ Architecture

### Frontend Stack

- **React 19** with TypeScript for type safety
- **Vite** for fast development and building
- **Recharts** for beautiful, interactive charts
- **Axios** for API communication
- **date-fns** for date manipulation
- **Custom CSS** with modern design patterns

### Backend Stack

- **FastAPI** for high-performance API
- **Pydantic** for data validation
- **Uvicorn** as ASGI server
- **JSON file storage** (easily replaceable with database)

### Project Structure

```
PieTracker/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── expenses.json        # Data storage
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   └── constants/      # App constants
│   ├── package.json        # Node.js dependencies
│   └── vite.config.ts      # Vite configuration
└── README.md               # This file
```

## 🔌 API Endpoints

| Method   | Endpoint                           | Description                     |
| -------- | ---------------------------------- | ------------------------------- |
| `GET`    | `/`                                | Welcome message                 |
| `GET`    | `/expenses`                        | Get all expenses                |
| `GET`    | `/expenses/month/{year}/{month}`   | Get expenses for specific month |
| `GET`    | `/expenses/summary/{year}/{month}` | Get monthly summary with totals |
| `POST`   | `/expenses`                        | Add new expense                 |
| `DELETE` | `/expenses/{expense_id}`           | Delete expense                  |
| `GET`    | `/categories`                      | Get available categories        |
| `GET`    | `/currencies`                      | Get supported currencies        |
| `GET`    | `/expenses/available-months`       | Get months with expense data    |

## 💱 Supported Currencies

- 🇨🇦 **CAD** - Canadian Dollar
- 🇺🇸 **USD** - US Dollar
- 🇪🇺 **EUR** - Euro
- 🇬🇧 **GBP** - British Pound
- 🇯🇵 **JPY** - Japanese Yen
- 🇦🇺 **AUD** - Australian Dollar
- 🇨🇭 **CHF** - Swiss Franc
- 🇨🇳 **CNY** - Chinese Yuan
- 🇮🇳 **INR** - Indian Rupee
- 🇧🇷 **BRL** - Brazilian Real

## 🎨 Customization

### Colors and Theming

The app uses CSS custom properties for easy theming. Edit `frontend/src/App.css`:

```css
:root {
  --primary-color: #your-color;
  --secondary-color: #your-color;
  /* More customizable properties */
}
```

### Adding New Categories

Categories are dynamically managed. Simply use a new category name when adding an expense, and it will be automatically saved for future use.

## 🚀 Deployment

### Backend on Render

1. **Create a new Web Service on Render**

   - Connect your GitHub repository
   - Set root directory to `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

2. **Environment Variables** (if needed)

   - Set `PYTHON_VERSION` to `3.11.0`

3. **Your backend will be available at**: `https://your-service-name.onrender.com`

### Frontend on Vercel

1. **Deploy to Vercel**

   - Connect your GitHub repository
   - Set root directory to `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

2. **Environment Variables**

   - Add `VITE_API_URL` = `https://your-backend-url.onrender.com`

3. **Your frontend will be available at**: `https://your-project.vercel.app`

### Alternative: Local Production Build

````bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm run build
npm run preview

```bash
cd backend
# Add your deployment configuration
# Update CORS origins for production
````

### Database Migration

The app currently uses JSON file storage. For production, consider migrating to:

- **PostgreSQL** for relational data
- **MongoDB** for document storage
- **SQLite** for simple deployments

## 🤝 Contributing

We welcome contributions! Here are some ways you can help:

1. **🐛 Bug Reports**: Found a bug? Open an issue with details
2. **✨ Feature Requests**: Have an idea? Let's discuss it!
3. **🔧 Pull Requests**:
   - Fork the repository
   - Create a feature branch
   - Make your changes
   - Add tests if applicable
   - Submit a pull request

### Development Setup

```bash
# Install dependencies for both frontend and backend
npm run install:all  # If you add this script

# Run both servers simultaneously
npm run dev:all      # If you add this script
```

## 📊 Screenshots

### Main Dashboard

_Beautiful expense tracking with real-time pie charts_

### Monthly Overview

_Compare spending patterns across different months_

### Multi-Currency Support

_Track expenses in your preferred currency_

## 🔜 Roadmap

- [ ] **User Authentication** - Multi-user support
- [ ] **Database Integration** - PostgreSQL/MongoDB support
- [ ] **Export Features** - CSV/PDF reports
- [ ] **Budget Tracking** - Set and monitor budgets
- [ ] **Recurring Expenses** - Automatic expense entries
- [ ] **Mobile App** - React Native version
- [ ] **Advanced Analytics** - Trends and predictions
- [ ] **Receipt Scanning** - OCR integration
- [ ] **Bank Integration** - Automatic transaction import

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Recharts** for amazing chart components
- **FastAPI** for the excellent Python framework
- **React Team** for the powerful frontend library
- **Vite** for lightning-fast development experience

---

<div align="center">

**Made with ❤️ for smart financial planning**

[Demo](https://your-demo-link.com) • [Documentation](https://your-docs-link.com) • [Report Bug](https://github.com/yourusername/PieTracker/issues) • [Request Feature](https://github.com/yourusername/PieTracker/issues)

</div>
