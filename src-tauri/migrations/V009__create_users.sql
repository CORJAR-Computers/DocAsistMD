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

-- Insert default admin user (password: admin123 - should be changed on first login)
INSERT INTO users (id, username, password_hash, full_name, email, role, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin', 'hashed_admin123', 'Administrador', 'admin@docasistmd.com', 'admin', 'active');
