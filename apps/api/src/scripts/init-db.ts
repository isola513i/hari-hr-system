import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars from the correct location BEFORE importing db
const envPath = path.resolve(__dirname, '../../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Now import pool
import pool from '../db';

const schema = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: employees
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(100),
    department VARCHAR(100),
    manager_id UUID REFERENCES employees(id),
    status VARCHAR(50) DEFAULT 'Active',
    join_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: leave_requests
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    approver_id UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: leave_balances
CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    year INT NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    quota_days INT DEFAULT 0,
    used_days DECIMAL(5,2) DEFAULT 0,
    CONSTRAINT unique_balance UNIQUE (employee_id, year, leave_type)
);

-- Initial Seed Data (Optional)
INSERT INTO employees (name, email, role, department, status) VALUES
('Ava Chen', 'ava.c@nexus.hr', 'CEO', 'Executive', 'Active'),
('David Lee', 'david.l@nexus.hr', 'CTO', 'Engineering', 'Active'),
('Olivia Roe', 'olivia.r@nexus.hr', 'CHRO', 'Human Resources', 'Active')
ON CONFLICT (email) DO NOTHING;
`;

const runMigration = async () => {
    try {
        console.log('Connecting to database...');
        console.log('Running migration...');

        await pool.query(schema);

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Error running migration:', err);
    } finally {
        await pool.end();
    }
};

runMigration();
