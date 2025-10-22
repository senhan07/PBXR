# Blackbox Exporter Monitoring System

A comprehensive web-based monitoring system for managing Blackbox Exporter targets, prober instances, and system settings. Built with Next.js 15, TypeScript, Tailwind CSS, and Prisma.

## Features

- **Target Management**: Add, edit, delete, and monitor Blackbox Exporter targets
- **Prober Management**: Configure and manage multiple prober instances
- **Real-time Monitoring**: Live status updates with WebSocket support
- **Advanced Search**: Filter targets by labels, URLs, and custom criteria
- **User Management**: Secure authentication with password and username changes
- **Settings Configuration**: Configure Prometheus, auto-logout, and system preferences
- **Responsive Design**: Mobile-friendly interface with dark mode support
- **Data Export**: Export targets and generate Prometheus configuration files

## Tech Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: SQLite (development), PostgreSQL (production ready)
- **Authentication**: Custom token-based authentication
- **Real-time**: Socket.IO for live updates
- **Styling**: Tailwind CSS with shadcn/ui components

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

## Quick Start

### Option 1: Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blackbox-exporter-monitoring
   ```

2. **Build and run with Docker**
   ```bash
   # Build the Docker image
   docker build -t blackbox-monitor .
   
   # Run the container
   docker run -p 3000:3000 --name blackbox-monitor blackbox-monitor
   ```

3. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - Default admin credentials will be created on first run

### Option 2: Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blackbox-exporter-monitoring
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Push database schema
   npm run db:push
   ```

4. **Create admin user** (optional - will be created automatically)
   ```bash
   # Run the setup script to create an admin user
   npm run setup
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="file:./dev.db"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Optional: External services
PROMETHEUS_URL="http://localhost:9090"
BLACKBOX_EXPORTER_URL="http://localhost:9115"
```

## Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
npm run db:generate  # Generate Prisma client

# Setup
npm run setup        # Create admin user
npm run init-admin   # Initialize default admin user
```

## Docker Deployment

### Development with Docker Compose

1. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - DATABASE_URL=file:./data/app.db
       volumes:
         - ./data:/app/data
       restart: unless-stopped
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

### Production Deployment

1. **Build for production**
   ```bash
   docker build -t blackbox-monitor:latest .
   ```

2. **Run with persistent storage**
   ```bash
   docker run -d \
     --name blackbox-monitor \
     -p 3000:3000 \
     -v $(pwd)/data:/app/data \
     -e NODE_ENV=production \
     blackbox-monitor:latest
   ```

## Configuration

### Initial Setup

1. **Access the admin panel** at `http://localhost:3000`
2. **Default admin credentials** (created automatically on first run):
   - Username: `admin`
   - Password: `admin123`
   - Email: `admin@localhost`
3. **Login with default credentials** and change the password immediately
4. **Configure Prometheus settings** in Settings → Prometheus
5. **Add prober instances** in Settings → Prober
6. **Start adding targets** from the main dashboard

### Default Admin User

The application automatically creates a default admin user on first startup:

- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@localhost`
- **Role**: `admin`

⚠️ **Important**: Change the default password immediately after first login for security reasons.

#### Manual Admin Creation

If you need to manually create or reset the admin user:

```bash
# Run the admin initialization script
npm run init-admin
```

This will:
- Check if an admin user exists
- Create a default admin if none exists
- Update existing 'admin' username to admin role if needed
- Display the admin credentials in the console

### Prometheus Integration

1. **Configure Prometheus address** in Settings → Prometheus
2. **Generate prometheus.yml** using the "Generate prometheus.yml" button
3. **Copy the configuration** to your Prometheus server
4. **Restart Prometheus** to load the new targets

### Auto-Logout Configuration

- Navigate to Settings → Account
- Enable "Auto Logout" 
- Set the inactivity timeout (1-120 minutes)
- Click "Save Account Settings"

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/change-username` - Change username

### Targets
- `GET /api/targets` - List all targets
- `POST /api/targets` - Create new target
- `PUT /api/targets/[id]` - Update target
- `DELETE /api/targets/[id]` - Delete target

### Probers
- `GET /api/probers` - List all probers
- `POST /api/probers` - Create new prober
- `PUT /api/probers/[id]` - Update prober
- `DELETE /api/probers/[id]` - Delete prober

### Settings
- `GET /api/user-settings` - Get user settings
- `POST /api/user-settings` - Update user settings
- `GET /api/settings` - Get app settings
- `POST /api/settings` - Update app settings

## Database Schema

The application uses Prisma ORM with the following main models:

- **User**: User accounts and authentication
- **BlackboxTarget**: Monitoring targets with labels and configuration
- **ProberInstance**: Blackbox exporter prober instances
- **Settings**: User-specific application settings
- **AppSetting**: Global application settings

## Troubleshooting

### Common Issues

1. **Database connection errors**
   ```bash
   # Regenerate Prisma client
   npx prisma generate
   npm run db:push
   ```

2. **Port already in use**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

3. **Permission issues with Docker**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER ./data
   ```

4. **Build errors**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

### Logs

- **Development**: Check terminal output for npm run dev
- **Docker**: Use `docker logs blackbox-monitor`
- **Production**: Check application logs in your hosting environment

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security Considerations

- Change default passwords in production
- Use HTTPS in production environments
- Regularly update dependencies
- Implement proper backup strategies for the database
- Use environment variables for sensitive configuration

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review the API documentation for integration details

---

**Note**: This application is designed to work with Blackbox Exporter and Prometheus. Ensure you have a running Blackbox Exporter instance before configuring targets.