-- V008: Create Audit Log table
CREATE TABLE audit_log (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(36),
    old_values VARCHAR(4000),
    new_values VARCHAR(4000),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT  NOT NULL
);

CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_date ON audit_log(created_at);
