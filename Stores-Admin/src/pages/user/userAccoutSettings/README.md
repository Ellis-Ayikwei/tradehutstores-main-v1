# User Settings Component Structure

This directory contains the refactored UserSettings component with a clean, modular structure.

## File Structure

```
userAccoutSettings/
├── UserSettings.tsx          # Main component with tab navigation
├── components/               # Individual tab components
│   ├── index.ts             # Component exports
│   ├── ProfileTab.tsx       # Profile management tab
│   ├── PreferencesTab.tsx   # User preferences tab
│   └── SecurityTab.tsx      # Security settings tab
├── types/                   # TypeScript interfaces
│   └── index.ts            # Type definitions
├── utils/                   # Utility functions
│   └── classNames.ts       # CSS class name utility
└── README.md               # This file
```

## Components

### Main Component
- **UserSettings.tsx**: Main container with tab navigation, state management, and authentication handling

### Tab Components
- **ProfileTab**: User profile information, avatar upload, basic details editing
- **PreferencesTab**: Language, theme, and notification preferences
- **SecurityTab**: Password change functionality with validation

### Utilities
- **classNames**: Utility function for conditional CSS class names
- **types**: Shared TypeScript interfaces for type safety

## Features

- ✅ Headless UI Tabs for navigation
- ✅ Tabler icons for consistent iconography
- ✅ Form validation and error handling
- ✅ Responsive design with Tailwind CSS
- ✅ Dark mode support
- ✅ TypeScript for type safety
- ✅ Modular component architecture
- ✅ Clean separation of concerns
- ✅ **API Integration**: Uses same endpoints as UserView components
- ✅ **Password Management**: Admin password change functionality
- ✅ **Real-time Notifications**: Success/error feedback with Mantine notifications
- ✅ **Backend Data Fetching**: Real user profile data from `/users/{id}/` endpoint
- ✅ **Data Synchronization**: Automatic refresh after updates

## Usage

```tsx
import UserSettings from './pages/user/userAccoutSettings/UserSettings';

// Use in your routes
<UserSettings />
```

## API Endpoints Used

The component integrates with the following backend endpoints (same as UserView):

- `GET /users/{id}/` - Fetch user profile data
- `PATCH /users/{id}/admin_update/` - Update user profile and preferences
- `POST /users/{id}/admin_change_password/` - Change user password (admin)

## Future Enhancements

- Two-factor authentication setup
- Profile picture upload integration
- Session management
- Security audit logs
- Advanced notification settings (if needed)
