# Agri-Shield Insurance Portal

A comprehensive insurance management platform for farmers, insurers, and administrators built with Next.js, Supabase, and Tailwind CSS.

## Features

- **Authentication**: Secure email/password authentication with role-based access control
- **Dashboard**: Real-time KPI cards and charts showing policies, claims, and weather alerts
- **Policies Management**: View and filter all insurance policies with detailed information
- **Claims Processing**: Review, approve, reject, and mark claims as paid with real-time updates
- **Farmers Directory**: Browse registered farmers and their farm profiles
- **Automation Monitor**: View weather data and trigger automated claim checks
- **Settings**: Admin panel to manage the policy catalog

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: Zustand
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   The `.env` file already contains the Supabase credentials.

4. Set up the database:
   - Open your Supabase project dashboard
   - Go to the SQL Editor
   - Copy and paste the contents of `database-schema.sql`
   - Run the SQL script to create all tables, indexes, RLS policies, and functions

5. Create test users:
   - Go to Supabase Dashboard > Authentication > Users
   - Create users with roles (admin, insurer, farmer)
   - After creating auth users, you can link them to the `user_profiles` table

### Running the Application

Development mode:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

## Database Schema

The application uses the following main tables:

- **user_profiles**: User information with role-based access (farmer, insurer, admin)
- **farm_profiles**: Farm details linked to farmers
- **policy_products**: Insurance policy catalog
- **user_policies**: Active policies purchased by farmers
- **weather_observations**: Weather data for automated claim triggering
- **claims**: Insurance claims with status tracking

## Features by Role

### Admin
- Full access to all modules
- Manage policy catalog
- View all users, policies, and claims
- Configure system settings

### Insurer
- View and manage policies
- Review and process claims
- View farmer information
- Monitor weather and automation

### Farmer
- View own policies and claims
- Manage farm profiles
- Purchase insurance policies

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based access control
- Secure authentication with Supabase Auth
- Protected routes and API endpoints

## Key Features

### Real-time Updates
The Claims module uses Supabase Realtime to automatically update when new claims are created or modified.

### Automated Claims
The system can automatically trigger claims based on weather conditions:
- Low rainfall (< 10mm average over 7 days)
- High temperature (> 45°C)

### Data Visualization
Beautiful charts and graphs showing:
- Claims trends over time
- Status distribution
- Weather alerts

## Project Structure

```
app/
├── (auth)/
│   ├── login/          # Login page
│   └── signup/         # Signup page
├── (dashboard)/
│   ├── dashboard/      # Main dashboard
│   ├── policies/       # Policies management
│   ├── claims/         # Claims processing
│   ├── farmers/        # Farmers directory
│   ├── automation/     # Automation monitor
│   └── settings/       # Admin settings
components/
├── dashboard/          # Dashboard-specific components
└── ui/                 # Shadcn UI components
lib/
├── supabase.ts        # Supabase client and types
├── auth.ts            # Authentication utilities
└── store.ts           # Zustand state management
```

## Design System

- **Primary Color**: Emerald (for nature/agriculture theme)
- **Typography**: Inter font family
- **Components**: Shadcn UI with custom styling
- **Animations**: Framer Motion for smooth transitions
- **Responsive**: Mobile-first design with breakpoints

## Support

For issues or questions, please refer to the documentation or contact the development team.

## License

Proprietary - All rights reserved
