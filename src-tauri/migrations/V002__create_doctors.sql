-- V002: Create Doctors table
CREATE TABLE doctors (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    schedule_start VARCHAR(5) DEFAULT  NOT NULL,
    schedule_end VARCHAR(5) DEFAULT  NOT NULL,
    working_days VARCHAR(20) DEFAULT  NOT NULL,2,3,4,5]',
    status VARCHAR(20) DEFAULT  NOT NULL,
    created_at TIMESTAMP DEFAULT  NOT NULL,
    updated_at TIMESTAMP DEFAULT  NOT NULL
);

CREATE UNIQUE INDEX idx_doctors_license ON doctors(license_number);
