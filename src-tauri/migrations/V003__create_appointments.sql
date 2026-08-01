-- V003: Create Appointments table
CREATE TABLE appointments (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    date_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT  NOT NULL,
    status VARCHAR(20) DEFAULT  NOT NULL,
    appointment_type VARCHAR(20) DEFAULT  NOT NULL,
    reason VARCHAR(500),
    notes VARCHAR(1000),
    created_at TIMESTAMP DEFAULT  NOT NULL,
    updated_at TIMESTAMP DEFAULT  NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

CREATE INDEX idx_appointments_date ON appointments(date_time);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
