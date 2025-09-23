# Component Architecture Overview

This document describes the refactored component structure of the Pie Tracker application.

## Directory Structure

```
src/
├── components/           # React components
│   ├── Header.tsx       # App header with title and floating nature elements
│   ├── ExpenseForm.tsx  # Left panel - expense form and recent expenses list
│   ├── ChartDisplay.tsx # Big pie chart in center
│   ├── InfoPanel.tsx    # Right panel - month selector, summary, legend, latest expense
│   └── ui/              # Reusable UI components (reserved for future)
├── hooks/               # Custom React hooks
│   └── useExpenses.ts   # Main data management hook
├── types/               # TypeScript type definitions
│   └── index.ts         # All shared interfaces and types
├── App.tsx              # Main application component
├── App.css              # All styles (preserved original beautiful design)
├── main.tsx             # React entry point
└── assets/              # Static assets
```

## Component Responsibilities

### App.tsx

- Main application orchestrator
- Uses the `useExpenses` hook for data management
- Composes all other components
- Maintains the same layout structure as original

### Header.tsx

- Renders the floating nature elements background (🌸🍃🌿)
- Displays the "Pie Tracker" title
- Shows current selected month/year
- Completely preserves original design

### ExpenseForm.tsx

- Left panel component (320px width maintained)
- Expense form with amount, category, description, date fields
- Recent expenses list with delete functionality
- All form validation and submission logic
- Maintains all original styling and leaf decorations

### ChartDisplay.tsx

- Big pie chart component (400px height, 120px radius)
- Uses elegant color palette from original design
- Responsive chart with proper tooltips
- Handles loading and no-data states
- Preserves all chart styling and animations

### InfoPanel.tsx

- Right panel with month/year selector
- Monthly summary information (total, count, categories)
- Chart legend with color-coded categories
- Latest expense display
- All original functionality preserved

### useExpenses.ts

- Custom hook managing all expense data
- API calls to backend (categories, summary, monthly expenses)
- State management for expenses, summary, loading states
- Add/delete expense functionality
- Month/year selection logic

### types/index.ts

- TypeScript interfaces for type safety
- Expense, MonthlySummary, FormData interfaces
- Chart data types and tooltip prop types

## Key Benefits of Refactoring

1. **Separation of Concerns**: Each component has a single responsibility
2. **Reusability**: Components can be easily reused or modified
3. **Maintainability**: Easier to debug and update specific features
4. **Type Safety**: Comprehensive TypeScript typing throughout
5. **Clean Architecture**: Logical organization of files and folders
6. **Preserved Functionality**: All original features and styling maintained
7. **Better Testing**: Components can be tested in isolation

## Design Preservation

- ✅ All original CSS styles maintained in App.css
- ✅ Beautiful botanical leaf animations preserved
- ✅ Green leaf decorations throughout the UI
- ✅ Elegant gradient effects and responsive layout
- ✅ Big chart layout with flex: 2 chart, flex: 1 info panel
- ✅ Centered title without flowers/pie elements
- ✅ Corner leaf animations and card decorations
- ✅ Canadian dollar formatting
- ✅ Google Fonts (Playfair Display, Inter, Crimson Text)

## API Integration

The components work seamlessly with the existing FastAPI backend:

- `/categories` - Fetches expense categories
- `/expenses/summary/{year}/{month}` - Monthly summary data
- `/expenses/month/{year}/{month}` - Monthly expenses list
- `POST /expenses` - Add new expense
- `DELETE /expenses/{id}` - Delete expense

## Future Enhancements

The new structure makes it easy to add:

- Unit tests for individual components
- Additional UI components in the `ui/` folder
- More custom hooks for specific functionality
- Feature additions without affecting other components
- Performance optimizations through component-level memoization

## Usage

The application maintains exactly the same user experience as before:

1. Both servers running (frontend on localhost:5174, backend on localhost:8000)
2. Add expenses using the left form panel
3. View beautiful pie chart in the center
4. See summary and legend in right panel
5. Switch between months using the month picker
6. Delete expenses from the recent expenses list

All functionality preserved while improving code organization and maintainability!
