-- V005: Create Prescriptions table
CREATE TABLE prescriptions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    consultation_id VARCHAR(36) NOT NULL,
    medication_id VARCHAR(36) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    instructions VARCHAR(500),
    created_at TIMESTAMP DEFAULT  NOT NULL,
    FOREIGN KEY (consultation_id) REFERENCES consultations(id),
    FOREIGN KEY (medication_id) REFERENCES medications(id)
);

CREATE INDEX idx_prescriptions_consultation ON prescriptions(consultation_id);
