# Common Items Admin Console

A comprehensive admin interface for managing common items, categories, brands, and models in the MoreVans system.

## Features

### 🏷️ Categories Management
- Create, edit, and delete item categories
- Simple name-based categorization
- Real-time updates

### 🏢 Brands Management
- Create, edit, and delete brands
- Associate brands with categories
- Filter brands by category
- Cascading dropdown support

### 📦 Models Management
- Create, edit, and delete models
- Associate models with brands
- Filter models by brand
- Hierarchical organization

### 📋 Common Items Management
- Full CRUD operations for common items
- Advanced filtering by category, brand, and model
- Search functionality
- Rich form with multiple field types:
  - Basic info (name, description)
  - Physical properties (weight, dimensions)
  - Special flags (fragile, needs disassembly)
  - Visual properties (icon, color, tab_color, image)
- Cascading dropdowns for category → brand → model selection

## Architecture

### Components Structure
```
src/pages/admin/CommonItems/
├── index.tsx              # Main entry point
├── AdminConsole.tsx       # Tab container
├── tabs/
│   ├── CategoriesTab.tsx  # Categories management
│   ├── BrandsTab.tsx      # Brands management
│   ├── ModelsTab.tsx      # Models management
│   └── ItemsTab.tsx       # Common items management
└── README.md             # This file
```

### UI Components
```
src/components/ui/
├── FilterSelect.tsx       # Reusable dropdown component
├── DataTable.tsx          # Reusable table component
└── CrudModal.tsx         # Reusable modal component
```

### API Services
```
src/services/commonItemService.ts
├── Categories API
├── Brands API
├── Models API
└── Common Items API
```

## Usage

### Navigation
The admin console features a tabbed interface with four main sections:
1. **Categories** - Manage item categories
2. **Brands** - Manage brands within categories
3. **Models** - Manage models within brands
4. **Common Items** - Manage the actual items with full details

### Common Items Form Fields

#### Basic Information
- **Name**: Item name
- **Description**: Detailed description
- **Category**: Select from available categories
- **Brand**: Select from brands in the chosen category
- **Model**: Select from models in the chosen brand

#### Physical Properties
- **Weight**: Numeric weight value
- **Dimensions**: JSON string for complex dimensions

#### Special Properties
- **Fragile**: Checkbox for fragile items
- **Needs Disassembly**: Checkbox for items requiring disassembly

#### Visual Properties
- **Icon**: FontAwesome icon name
- **Color**: CSS color value
- **Tab Color**: Color for UI tabs
- **Image URL**: URL to item image

### Filtering and Search

#### Categories Tab
- Simple list with search capability

#### Brands Tab
- Filter by category
- Search within filtered results

#### Models Tab
- Filter by brand
- Search within filtered results

#### Common Items Tab
- Multi-level filtering: Category → Brand → Model
- Text search across all fields
- Real-time filtering with cascading dropdowns

## API Endpoints

### Categories
- `GET /categories/` - List categories
- `POST /categories/` - Create category
- `PUT /categories/{id}/` - Update category
- `DELETE /categories/{id}/` - Delete category

### Brands
- `GET /brands/` - List brands (with optional category_id filter)
- `POST /brands/` - Create brand
- `PUT /brands/{id}/` - Update brand
- `DELETE /brands/{id}/` - Delete brand

### Models
- `GET /models/` - List models (with optional brand_id filter)
- `POST /models/` - Create model
- `PUT /models/{id}/` - Update model
- `DELETE /models/{id}/` - Delete model

### Common Items
- `GET /common-items/` - List items
- `POST /common-items/` - Create item
- `PUT /common-items/{id}/` - Update item
- `DELETE /common-items/{id}/` - Delete item

## Data Flow

1. **Categories** are the top-level organizational unit
2. **Brands** belong to categories and provide the second level
3. **Models** belong to brands and provide the third level
4. **Common Items** are the actual items with full details and belong to a specific category/brand/model combination

## Error Handling

- All API calls include try-catch blocks
- Console error logging for debugging
- User-friendly error messages
- Graceful degradation when data fails to load

## Future Enhancements

- Bulk operations (import/export)
- Image upload functionality
- Advanced search with multiple criteria
- Pagination for large datasets
- Real-time collaboration features
- Audit trail for changes
- Version control for items

## Dependencies

- React 18+
- TypeScript
- Lucide React (icons)
- Tailwind CSS (styling)
- Axios (API calls)

## Development

To add new features or modify existing functionality:

1. Update the appropriate tab component
2. Add new API endpoints to `commonItemService.ts`
3. Update TypeScript interfaces as needed
4. Test the cascading dropdown behavior
5. Ensure error handling is in place

## Notes

- The cascading dropdown behavior ensures data integrity
- All form fields are properly validated
- The UI is responsive and accessible
- The code follows React best practices
- TypeScript provides type safety throughout 