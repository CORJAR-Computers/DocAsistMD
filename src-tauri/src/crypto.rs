use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM};
use ring::digest::{digest, SHA256};
use ring::rand::{SecureRandom, SystemRandom};

const ENCRYPT_PREFIX: &str = "$ENC$v1$";
const FIELD_CRYPT_KEY_SOURCE: &str = "DocAsistMD::FieldEncryption::Secret2026";
const NONCE_LEN: usize = 12;

fn derive_key() -> [u8; 32] {
    let hash = digest(&SHA256, FIELD_CRYPT_KEY_SOURCE.as_bytes());
    let mut key = [0u8; 32];
    key.copy_from_slice(hash.as_ref());
    key
}

/// Encrypts an optional text field using AES-256-GCM.
/// Returns `$ENC$v1$` + hex(nonce + ciphertext + tag).
pub fn encrypt_field(plaintext: Option<&str>) -> Option<String> {
    let text = plaintext?;
    if text.trim().is_empty() {
        return Some(text.to_string());
    }
    // Don't re-encrypt if already encrypted
    if text.starts_with(ENCRYPT_PREFIX) {
        return Some(text.to_string());
    }

    let key_bytes = derive_key();
    let unbound = UnboundKey::new(&AES_256_GCM, &key_bytes).ok()?;
    let key = LessSafeKey::new(unbound);

    let mut nonce_bytes = [0u8; NONCE_LEN];
    SystemRandom::new().fill(&mut nonce_bytes).ok()?;
    let nonce = Nonce::try_assume_unique_for_key(&nonce_bytes).ok()?;

    let mut in_out = text.as_bytes().to_vec();
    key.seal_in_place_append_tag(nonce, Aad::empty(), &mut in_out).ok()?;

    let mut blob = nonce_bytes.to_vec();
    blob.extend_from_slice(&in_out);
    Some(format!("{}{}", ENCRYPT_PREFIX, hex::encode(blob)))
}

/// Decrypts a text field if encrypted with `$ENC$v1$`.
/// If it's unencrypted plain text (e.g. legacy records), returns it as-is.
pub fn decrypt_field(ciphertext: Option<String>) -> Option<String> {
    let text = ciphertext?;
    if !text.starts_with(ENCRYPT_PREFIX) {
        return Some(text);
    }
    let hex_part = &text[ENCRYPT_PREFIX.len()..];
    let blob = hex::decode(hex_part.trim()).ok()?;
    if blob.len() <= NONCE_LEN {
        return Some(text);
    }

    let key_bytes = derive_key();
    let unbound = UnboundKey::new(&AES_256_GCM, &key_bytes).ok()?;
    let key = LessSafeKey::new(unbound);

    let (nonce_bytes, ciphertext_bytes) = blob.split_at(NONCE_LEN);
    let nonce = Nonce::try_assume_unique_for_key(nonce_bytes).ok()?;

    let mut in_out = ciphertext_bytes.to_vec();
    let plaintext = key.open_in_place(nonce, Aad::empty(), &mut in_out).ok()?;
    String::from_utf8(plaintext.to_vec()).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_field_encryption_decryption_roundtrip() {
        let original = "Paciente refiere cefalea intensa y fiebre de 38.5°C";
        let encrypted = encrypt_field(Some(original)).expect("encryption succeeds");
        assert!(encrypted.starts_with(ENCRYPT_PREFIX));
        assert_ne!(encrypted, original);

        let decrypted = decrypt_field(Some(encrypted)).expect("decryption succeeds");
        assert_eq!(decrypted, original);
    }

    #[test]
    fn test_unencrypted_legacy_fallback() {
        let legacy = "Alergia a la penicilina";
        let decrypted = decrypt_field(Some(legacy.to_string())).expect("fallback succeeds");
        assert_eq!(decrypted, legacy);
    }

    #[test]
    fn test_none_handling() {
        assert_eq!(encrypt_field(None), None);
        assert_eq!(decrypt_field(None), None);
    }
}
