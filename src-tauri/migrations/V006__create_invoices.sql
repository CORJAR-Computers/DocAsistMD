-- V006: Create Invoices table
CREATE TABLE invoices (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    appointment_id VARCHAR(36),
    patient_id VARCHAR(36) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1900,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(20),
    due_date DATE,
    paid_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_status ON invoices(status);
