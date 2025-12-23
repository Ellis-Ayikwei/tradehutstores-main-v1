# Next.js E-Commerce Application

A modern e-commerce platform built with Next.js 14+ (App Router), TypeScript, Redux Toolkit, and Tailwind CSS.

## Features

- 🚀 **Next.js 14+ with App Router**
- 📝 **TypeScript** for type safety
- 🎨 **Tailwind CSS** for styling
- 🏪 **Redux Toolkit** for state management
- 🔐 **React Auth Kit** for authentication
- 🎯 **Lucid React Icons** & **Tabler Icons**
- 🎨 **Ant Design** components
- 🌍 **i18next** for internationalization
- 💳 **Shopping Cart** functionality
- ❤️ **Wishlist** feature
- 📱 **Fully responsive design**
- 🌙 **Dark mode support**
- 💱 **Multi-currency support**

## Tech Stack

- **Frontend Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Ant Design
- **State Management:** Redux Toolkit
- **Authentication:** React Auth Kit
- **Icons:** Lucid React, Tabler Icons
- **Animations:** Framer Motion
- **HTTP Client:** Axios
- **Data Fetching:** SWR
- **Internationalization:** i18next

## Project Structure

```
nextjs-app/
├── app/                    # Next.js app router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage
│   ├── products/          # Product pages
│   ├── cart/              # Cart page
│   ├── auth/              # Authentication pages
│   └── ...
├── components/            # Reusable components
│   ├── Navigation/        # Navigation components
│   ├── Products/          # Product components
│   ├── Layouts/           # Layout components
│   └── common/            # Common components
├── store/                 # Redux store and slices
├── contexts/              # React contexts
├── providers/             # Provider components
├── lib/                   # Utility functions and helpers
├── types/                 # TypeScript type definitions
├── styles/                # Global styles
└── public/                # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nextjs-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Key Features Implementation

### 🛒 Shopping Cart
- Add/remove items
- Update quantities
- Calculate totals with tax and shipping
- Persistent cart state with Redux

### ❤️ Wishlist
- Save favorite products
- Move items to cart
- Manage wishlist items

### 🔐 Authentication
- User login/registration
- Protected routes
- JWT token management
- Social login support

### 💱 Multi-Currency
- Real-time currency conversion
- Multiple currency options
- Formatted price display

### 🌙 Dark Mode
- System preference detection
- Manual toggle
- Persistent theme preference

### 🌍 Internationalization
- Multiple language support
- Dynamic language switching
- Localized content

## API Integration

The app expects a backend API with the following endpoints:

- `/api/products` - Product endpoints
- `/api/cart` - Cart management
- `/api/wishlist` - Wishlist management
- `/api/auth` - Authentication
- `/api/checkout` - Order processing

## Deployment

### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

### Docker
```bash
docker build -t nextjs-ecommerce .
docker run -p 3000:3000 nextjs-ecommerce
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@eshop.com or open an issue in the repository.