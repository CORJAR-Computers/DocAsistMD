-- V007: Create Medications table
CREATE TABLE medications (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    active_ingredient VARCHAR(200) NOT NULL,
    presentation VARCHAR(100) NOT NULL,
    concentration VARCHAR(100),
    current_stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 10,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    expiry_date DATE,
    supplier VARCHAR(150),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medications_name ON medications(name);
CREATE INDEX idx_medications_stock ON medications(current_stock);
