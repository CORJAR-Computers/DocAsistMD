-- V004: Create Consultations (EHR) table
CREATE TABLE consultations (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    appointment_id VARCHAR(36) NOT NULL,
    patient_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    vital_signs VARCHAR(500),
    symptoms VARCHAR(1000),
    diagnosis VARCHAR(500),
    cie10_code VARCHAR(10),
    treatment_plan VARCHAR(2000),
    clinical_notes VARCHAR(3000),
    created_at TIMESTAMP DEFAULT  NOT NULL,
    updated_at TIMESTAMP DEFAULT  NOT NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

CREATE INDEX idx_consultations_patient ON consultations(patient_id);
CREATE INDEX idx_consultations_date ON consultations(created_at);
