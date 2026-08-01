-- V002: Create Doctors table
CREATE TABLE doctors (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    schedule_start VARCHAR(5) NOT NULL DEFAULT '08:00',
    schedule_end VARCHAR(5) NOT NULL DEFAULT '17:00',
    working_days VARCHAR(20) NOT NULL DEFAULT '[1,2,3,4,5]',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_doctors_license ON doctors(license_number);
