# Coliving Management System

A comprehensive property management platform built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- **Property Management**: Manage multiple coliving properties
- **Tenant Management**: Track tenant information and lease agreements
- **Payment Tracking**: Monitor rent payments and financial transactions
- **Expense Management**: Track property expenses and maintenance costs
- **Role-Based Access**: Owner, Manager, and Tenant roles with appropriate permissions
- **Mobile-First Design**: Responsive design optimized for mobile devices

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript 5.3.3
- **Styling**: Tailwind CSS 3.3.6
- **Database**: Vercel KV (Redis)
- **Authentication**: NextAuth.js 4.24.5
- **File Storage**: Vercel Blob
- **Testing**: Vitest, Playwright
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Vercel account (for deployment and services)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd coliving-management
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in the required environment variables in `.env.local`:

- `KV_REST_API_URL`: Your Vercel KV Redis URL
- `KV_REST_API_TOKEN`: Your Vercel KV Redis token
- `NEXTAUTH_SECRET`: A random secret for NextAuth.js
- `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob storage token

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

Run unit tests:
```bash
npm run test
```

Run E2E tests:
```bash
npm run test:e2e
```

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   ├── payments/          # Payment management
│   ├── expenses/          # Expense management
│   ├── tenants/           # Tenant management
│   └── api/               # API routes
├── components/            # Reusable React components
├── lib/                   # Utility functions and configurations
│   ├── auth.ts           # Authentication configuration
│   ├── db.ts             # Database utilities
│   └── utils.ts          # General utilities
├── types/                 # TypeScript type definitions
├── test/                  # Test setup and utilities
└── e2e/                   # End-to-end tests
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `KV_REST_API_URL` | Vercel KV Redis URL | Yes |
| `KV_REST_API_TOKEN` | Vercel KV Redis token | Yes |
| `NEXTAUTH_URL` | NextAuth.js URL | Yes |
| `NEXTAUTH_SECRET` | NextAuth.js secret | Yes |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token | Yes |
| `RESEND_API_KEY` | Resend email service key | Optional |
| `STRIPE_SECRET_KEY` | Stripe secret key | Optional |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Optional |

## Deployment

This application is optimized for deployment on Vercel:

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.
