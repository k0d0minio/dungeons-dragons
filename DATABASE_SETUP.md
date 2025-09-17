# Database Setup Guide

## 🚀 Quick Start

### 1. **Local Development Setup**

#### Option A: Docker (Recommended)
```bash
# Create docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: dnd_toolbox
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# Start the database
docker-compose up -d

# Your local DATABASE_URL will be:
DATABASE_URL="postgresql://postgres:password@localhost:5432/dnd_toolbox?schema=public"
```

#### Option B: Local PostgreSQL
```bash
# Install PostgreSQL locally
# Ubuntu/Debian:
sudo apt-get install postgresql postgresql-contrib

# macOS:
brew install postgresql

# Create database
createdb dnd_toolbox

# Your DATABASE_URL will be:
DATABASE_URL="postgresql://your_username@localhost:5432/dnd_toolbox?schema=public"
```

### 2. **Vercel Production Setup**

#### Step 1: Create Vercel Postgres Database
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to "Storage" tab
4. Click "Create Database" → "Postgres"
5. Choose "Neon" as provider
6. Select region (closest to your users)
7. Click "Create"

#### Step 2: Get Connection String
1. In your Vercel project dashboard
2. Go to "Storage" → Your database
3. Click "Connect" → "Environment Variables"
4. Copy the `DATABASE_URL`
5. Add it to your Vercel environment variables

### 3. **Environment Variables**

Create `.env.local` file:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/dnd_toolbox?schema=public"

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key-here"

# App Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here"
```

### 4. **Database Migration**

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Seed database
npx prisma db seed
```

### 5. **Vercel Deployment**

1. Push your code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## 🔧 Commands Reference

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio

# Deploy migrations to production
npx prisma migrate deploy
```

## 📊 Database Schema

The schema includes:
- **Users**: Simple password-based authentication
- **Characters**: Full D&D 5e character sheets
- **Notes**: Session, campaign, player, and DM notes
- **Inventory**: Equipment and magic items
- **Combat**: Initiative tracking and combat sessions

## 🚨 Important Notes

1. **Never commit `.env.local`** - it's in `.gitignore`
2. **Use different databases** for development and production
3. **Backup your data** before major migrations
4. **Test locally** before deploying to production
