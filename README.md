# PieTracker 💖✨ - Girly Finance App

A beautiful and feminine expense tracking web application built with React and FastAPI, designed specifically for tracking expenses in Canadian dollars with lovely pie charts!

## Features 🌸

- 💖 **Girly Design**: Beautiful pink and rose-gold color scheme with floating hearts
- 🇨🇦 **Canadian Dollars**: All amounts displayed in CAD currency
- 📊 **Monthly Pie Charts**: Visual representation of spending by category
- 🗓️ **Month Comparison**: Switch between different months to compare spending
- 🛍️ **14+ Categories**: Pre-defined categories with cute emojis like Shopping, Beauty & Skincare, Fashion, etc.
- ✨ **Real-time Updates**: Add expenses and see charts update immediately
- 📱 **Responsive Design**: Works beautifully on desktop and mobile

## Getting Started 🚀

### Prerequisites

- Python 3.7+ (tested with Python 3.13)
- Node.js 16+
- npm or yarn

### Installation

1. **Clone the repository:**

   ```bash
   git clone <your-repo-url>
   cd PieTracker2
   ```

2. **Set up the backend:**

   ```bash
   cd backend

   # Create virtual environment
   python -m venv ../.venv

   # Activate virtual environment (Windows)
   ..\.venv\Scripts\activate

   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Set up the frontend:**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the backend server:**

   ```bash
   cd backend
   ..\.venv\Scripts\python main.py
   ```

   The API will be available at `http://localhost:8000`

2. **Start the frontend server:**
   ```bash
   cd frontend
   npm run dev
   ```
   The app will be available at `http://localhost:5173` (or next available port)

## Usage Guide 💕

### Adding Expenses

1. Fill out the "Add New Expense" form on the left side
2. Enter the amount in Canadian dollars
3. Select a category from the dropdown (all have cute emojis!)
4. Add a description of what you spent money on
5. Choose the date (defaults to today)
6. Click "✨ Add Expense ✨"

### Viewing Monthly Data

1. Use the month/year selectors in the "Monthly Overview" section
2. See your total spending for the month
3. View the beautiful pie chart showing spending by category
4. Check the list of individual expenses below the form

### Categories Available 🏷️

- 🛍️ Shopping
- 🍰 Food & Dining
- 💄 Beauty & Skincare
- 👗 Fashion
- 🏠 Home & Living
- 🚗 Transportation
- 💊 Health & Wellness
- 🎉 Entertainment
- 📚 Education
- 💝 Gifts
- ☕ Coffee & Treats
- 💅 Self Care
- 🏃‍♀️ Fitness
- 📱 Subscriptions
- 💰 Other

## API Endpoints 🔌

- `GET /` - Welcome message
- `GET /expenses` - Get all expenses
- `GET /expenses/month/{year}/{month}` - Get expenses for a specific month
- `GET /expenses/summary/{year}/{month}` - Get monthly summary with totals by category
- `POST /expenses` - Add a new expense
- `DELETE /expenses/{expense_id}` - Delete an expense
- `GET /categories` - Get all available categories

## Data Storage 💾

The app currently uses local JSON file storage (`expenses.json`) in the backend directory. In a production environment, you would want to use a proper database like PostgreSQL or MongoDB.

## Customization 🎨

### Colors

The app uses CSS custom properties for easy color customization. Edit `frontend/src/App.css` and modify the `:root` variables:

```css
:root {
  --primary-pink: #ff69b4;
  --soft-pink: #ffb6c1;
  --pale-pink: #ffe4e1;
  --rose-gold: #e8b4a0;
  --lavender: #e6e6fa;
  /* ... more colors */
}
```

### Categories

Add or modify categories by editing the `/categories` endpoint in `backend/main.py`.

## Technologies Used 💻

### Frontend

- React 19 with TypeScript
- Recharts for pie charts
- Axios for API calls
- date-fns for date formatting
- Custom CSS with CSS Grid and Flexbox

### Backend

- FastAPI (Python web framework)
- Pydantic for data validation
- Uvicorn as ASGI server
- JSON file storage

## Contributing 🤝

This app was made with love for expense tracking! Feel free to contribute by:

- Adding new features
- Improving the design
- Adding more chart types
- Implementing database storage
- Adding user authentication

## License 📄

This project is open source and available under the [MIT License](LICENSE).

---

Made with 💖 for smart financial planning!
