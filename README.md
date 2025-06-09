# LogistiTrack - Inventory & Logistics Management System

A comprehensive inventory and logistics management system built with React, TypeScript, and Supabase.

## 🚀 Features

### Core Functionality
- **Multi-role Authentication** - Support for admins, warehouse workers, logisticians, managers, drivers, and customers
- **Warehouse Management** - Manage multiple warehouses with zones and capacity tracking
- **Product Management** - Complete product catalog with categories and inventory tracking
- **Order Management** - Full order lifecycle from creation to delivery
- **Logistics Management** - Vehicle tracking, route planning, and delivery management
- **Real-time Tracking** - Live vehicle location tracking and delivery updates
- **Inventory Tracking** - Real-time inventory levels with low stock alerts
- **Reporting & Analytics** - Comprehensive dashboards and reports

### Technical Features
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Real-time Updates** - Live data synchronization using Supabase subscriptions
- **Role-based Access Control** - Secure access based on user roles
- **Interactive Maps** - Warehouse locations and delivery route visualization
- **Notification System** - Real-time alerts and notifications
- **Error Handling** - Comprehensive error boundaries and user feedback

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time subscriptions)
- **State Management**: Zustand
- **Routing**: React Router v6
- **Maps**: Mapbox GL JS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Build Tool**: Vite

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd inventory-logistics-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
   ```

4. **Get Mapbox Access Token**
   - Go to [mapbox.com](https://www.mapbox.com/)
   - Create a free account
   - Navigate to your [Account page](https://account.mapbox.com/)
   - Copy your default public token or create a new one
   - Add it to your `.env` file as `VITE_MAPBOX_ACCESS_TOKEN`

5. **Set up Supabase**
   - Create a new Supabase project
   - Run the migrations in the `supabase/migrations` folder
   - Set up the edge function for route optimization

6. **Start the development server**
   ```bash
   npm run dev
   ```

## 🗺️ Mapbox Setup

### Getting Your Mapbox Token

1. **Create Account**
   - Visit [mapbox.com](https://www.mapbox.com/)
   - Sign up for a free account

2. **Get Access Token**
   - Go to your [Account page](https://account.mapbox.com/)
   - Find your "Default public token" or create a new one
   - Copy the token (it starts with `pk.`)

3. **Add to Environment**
   ```env
   VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNscXh4eHh4eDAweHgzYW1zZHNkc2RzZCJ9.xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Token Scopes
For this application, the default public token with these scopes is sufficient:
- `styles:read`
- `fonts:read`
- `datasets:read`
- `geocoding:read`

### Free Tier Limits
Mapbox offers generous free tier limits:
- 50,000 map loads per month
- 100,000 geocoding requests per month
- 25,000 directions requests per month

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── common/         # Common components (ErrorBoundary, ProtectedRoute)
│   ├── dashboard/      # Dashboard-specific components
│   ├── layout/         # Layout components (Sidebar, TopBar)
│   ├── logistics/      # Logistics management components
│   ├── notifications/  # Notification system components
│   ├── orders/         # Order management components
│   ├── products/       # Product management components
│   ├── settings/       # Settings page components
│   ├── ui/            # Base UI components (Button, Input, Modal, etc.)
│   └── warehouses/    # Warehouse management components
├── lib/               # External library configurations
├── pages/             # Page components
├── store/             # Zustand stores
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## 🔐 User Roles & Permissions

### Admin
- Full system access
- User management
- System configuration

### Manager
- View all data
- Generate reports
- Manage staff

### Warehouse Worker
- Manage products and inventory
- Process orders
- Conduct inventory counts

### Logistician
- Manage vehicles and routes
- Plan deliveries
- Track shipments

### Driver
- View assigned routes
- Update delivery status
- Report issues

### Customer
- Place orders
- Track deliveries in real-time
- View order history
- Receive live notifications

## 🗄️ Database Schema

The system uses a comprehensive PostgreSQL schema with the following main tables:

- **profiles** - User profiles and roles
- **warehouses** - Warehouse locations and details
- **warehouse_zones** - Warehouse zones and capacity
- **products** - Product catalog
- **product_categories** - Product categorization
- **inventory_levels** - Stock levels per warehouse
- **orders** - Customer orders
- **order_items** - Individual order items
- **vehicles** - Fleet management
- **delivery_routes** - Route planning
- **delivery_stops** - Individual delivery stops
- **notifications** - Real-time notifications

## 🚀 Deployment

### Frontend Deployment
The application can be deployed to any static hosting service:

```bash
npm run build
```

### Supabase Setup
1. Create a Supabase project
2. Run all migrations from `supabase/migrations/`
3. Deploy the edge function for route optimization
4. Configure authentication providers if needed

### Environment Variables
Ensure all environment variables are properly set in your deployment environment:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_MAPBOX_ACCESS_TOKEN` - Your Mapbox access token

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style
- TypeScript for type safety
- ESLint for code quality
- Tailwind CSS for styling
- Component-based architecture

## 📊 Features Overview

### Dashboard
- Real-time metrics and KPIs
- Interactive charts and graphs
- Quick access to key functions
- Role-specific views

### Inventory Management
- Product catalog management
- Stock level tracking
- Low stock alerts
- Inventory transactions

### Order Management
- Order creation and processing
- Status tracking
- Customer notifications
- Order history

### Logistics
- Vehicle fleet management
- Route planning and optimization
- Real-time tracking with GPS simulation
- Delivery management

### Real-time Features
- Live order tracking with maps
- GPS simulation for delivery vehicles
- Real-time notifications
- Live updates on dashboard

### Reporting
- Inventory reports
- Sales analytics
- Performance metrics
- Custom date ranges

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the repository or contact the development team.

## 🔧 Troubleshooting

### Mapbox Issues
- **"API access token is required"**: Make sure `VITE_MAPBOX_ACCESS_TOKEN` is set in your `.env` file
- **Maps not loading**: Check that your token is valid and has the correct scopes
- **Quota exceeded**: Monitor your usage on the Mapbox dashboard

### Common Issues
- **Build errors**: Make sure all environment variables are set
- **Database connection**: Verify Supabase URL and keys
- **Real-time updates not working**: Check Supabase RLS policies