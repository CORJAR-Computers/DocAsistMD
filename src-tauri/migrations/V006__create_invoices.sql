-- V006: Create Invoices table
CREATE TABLE invoices (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    appointment_id VARCHAR(36),
    patient_id VARCHAR(36) NOT NULL,
    subtotal DECIMAL(12,2) DEFAULT  NOT NULL,
    tax_rate DECIMAL(5,4) DEFAULT  NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT  NOT NULL,
    total DECIMAL(12,2) DEFAULT  NOT NULL,
    status VARCHAR(20) DEFAULT  NOT NULL,
    payment_method VARCHAR(20),
    due_date DATE,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT  NOT NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_status ON invoices(status);
