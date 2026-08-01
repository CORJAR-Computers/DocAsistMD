-- V003: Create Appointments table
CREATE TABLE appointments (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    date_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    appointment_type VARCHAR(20) NOT NULL DEFAULT 'consultation',
    reason VARCHAR(500),
    notes VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

CREATE INDEX idx_appointments_date ON appointments(date_time);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
