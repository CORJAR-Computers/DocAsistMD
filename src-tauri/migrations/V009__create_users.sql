-- V009: Create Users table
CREATE TABLE users (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    role VARCHAR(20) NOT NULL DEFAULT 'receptionist',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_username ON users(username);

-- Default admin user is seeded by the application (db.rs) with a proper SHA-256 hash
-- Password: admin123 (must be changed on first login)
