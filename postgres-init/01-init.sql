-- MarketHub PostgreSQL Database Initialization
-- This script sets up the initial database configuration

-- Create additional database if needed
-- CREATE DATABASE markethub_test;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE markethub_db TO markethub_user;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Basic configuration
ALTER DATABASE markethub_db SET timezone TO 'UTC';
