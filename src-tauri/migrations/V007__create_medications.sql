-- V007: Create Medications table
CREATE TABLE medications (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    active_ingredient VARCHAR(200) NOT NULL,
    presentation VARCHAR(100) NOT NULL,
    concentration VARCHAR(100),
    current_stock INTEGER DEFAULT  NOT NULL,
    minimum_stock INTEGER DEFAULT  NOT NULL,
    unit_price DECIMAL(10,2) DEFAULT  NOT NULL,
    expiry_date DATE,
    supplier VARCHAR(150),
    created_at TIMESTAMP DEFAULT  NOT NULL,
    updated_at TIMESTAMP DEFAULT  NOT NULL
);

CREATE INDEX idx_medications_name ON medications(name);
CREATE INDEX idx_medications_stock ON medications(current_stock);
