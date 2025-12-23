# Pricing Admin Components

This directory contains the modular components for the modernized pricing admin interface.

## Components

### `ConfigurationsTab.tsx`
- Displays pricing configurations in a modern card-based layout
- Shows statistics cards with key metrics
- Handles configuration CRUD operations
- Features gradient headers and modern styling

### `FactorsTab.tsx`
- Displays pricing factors with advanced filtering and search
- Category-based filtering with color-coded icons
- Search functionality across factor names and descriptions
- Modern card layout with category-specific styling

### `TabNavigation.tsx`
- Modern tab navigation with gradient styling
- Contextual help information for each tab
- Smooth transitions and hover effects

### `LoadingSpinner.tsx`
- Modern loading spinner with descriptive text
- Consistent with the overall design system

### `ErrorAlert.tsx`
- Error display component with icon and styling
- Handles null error states gracefully

### `index.ts`
- Central export file for all components
- Enables clean imports from other files

## Features

### Modern UI Elements
- **Gradient backgrounds** for headers and buttons
- **Card-based layouts** with hover effects
- **Color-coded categories** for easy identification
- **Responsive design** for all screen sizes
- **Dark mode support** throughout

### Enhanced Functionality
- **Advanced filtering** by category and search terms
- **Statistics cards** showing key metrics
- **Empty states** with helpful guidance
- **Loading states** with descriptive feedback
- **Error handling** with user-friendly messages

### Performance Optimizations
- **Modular components** for better maintainability
- **Conditional rendering** to reduce unnecessary renders
- **Efficient filtering** with optimized algorithms
- **Clean separation** of concerns

## Usage

```tsx
import { 
    ConfigurationsTab, 
    FactorsTab, 
    TabNavigation, 
    LoadingSpinner, 
    ErrorAlert 
} from './components';

// Use in your main component
<TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
<ConfigurationsTab 
    configurations={configurations}
    onAddConfiguration={handleAdd}
    onEditConfiguration={handleEdit}
    onDeleteConfiguration={handleDelete}
    onSetDefault={handleSetDefault}
/>
```

## Design System

### Colors
- **Blue gradient**: Configurations (primary)
- **Purple/Pink gradient**: Factors (secondary)
- **Category colors**: Each factor type has its own color scheme
- **Status colors**: Green (active), Red (inactive), Yellow (default)

### Typography
- **Headers**: Large, bold text with proper hierarchy
- **Body text**: Readable with good contrast
- **Labels**: Small, medium weight for metadata

### Spacing
- **Consistent padding**: 6px, 12px, 24px, 48px
- **Card spacing**: 24px between cards
- **Section spacing**: 32px between major sections

### Interactions
- **Hover effects**: Subtle shadows and color changes
- **Focus states**: Clear ring indicators
- **Transitions**: Smooth 200ms transitions
- **Loading states**: Spinner with descriptive text 