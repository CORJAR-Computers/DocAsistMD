-- V001: Create Patients table
CREATE TABLE patients (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    document_id VARCHAR(50) NOT NULL,
    document_type VARCHAR(10) DEFAULT  NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(1) DEFAULT  NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    address VARCHAR(300),
    blood_type VARCHAR(5),
    allergies VARCHAR(500),
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(20),
    insurance_provider VARCHAR(100),
    insurance_policy_number VARCHAR(50),
    insurance_expiry_date DATE,
    notes VARCHAR(1000),
    created_at TIMESTAMP DEFAULT  NOT NULL,
    updated_at TIMESTAMP DEFAULT  NOT NULL
);

CREATE UNIQUE INDEX idx_patients_document ON patients(document_id);
CREATE INDEX idx_patients_name ON patients(last_name, first_name);
