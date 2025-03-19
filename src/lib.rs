use age::Decryptor;
use hex::ToHex;
use snarkvm_algorithms::EncryptionScheme;
use snarkvm_dpc::{parameters::testnet2::Testnet2Parameters, Address, Parameters, PrivateKey};
use std::{io::Read, str::FromStr};
use wasm_bindgen::prelude::*;

/// Generate a testnet2 address from a private key
#[wasm_bindgen]
pub fn decrypt_private_key(passphrase: &str, encrypted: &str) -> Result<String, String> {
    let decoded =
        hex::decode(encrypted).map_err(|e| format!("failed to decode encrypted key: {e}"))?;
    let decryptor = Decryptor::new(decoded.as_slice())
        .map_err(|e| format!("failed to create decryptor: {e}"))?;
    let Decryptor::Passphrase(decryptor) = decryptor else {
        return Err("invalid decryptor - expected passphrase".to_string());
    };
    let mut reader = decryptor
        .decrypt(
            &secrecy::SecretString::from_str(passphrase).map_err(|e| e.to_string())?,
            None,
        )
        .map_err(|e| format!("failed to decrypt key: {e}"))?;
    let mut output = vec![];
    reader
        .read_to_end(&mut output)
        .map_err(|e| format!("failed to read decrypted key: {e}"))?;
    String::from_utf8(output).map_err(|e| format!("failed to convert decrypted key to string: {e}"))
}

#[wasm_bindgen]
pub fn verify_private_key(private_key: &str) -> Result<String, String> {
    let key = PrivateKey::<Testnet2Parameters>::from_str(private_key).map_err(|e| e.to_string())?;
    let address = Address::from_private_key(&key).map_err(|e| e.to_string())?;
    Ok(address.to_string())
}

#[wasm_bindgen]
pub fn decrypt_ciphertext(
    private_key: &str,
    ciphertext_hex: &str,
) -> Result<Option<String>, String> {
    let ciphertext =
        hex::decode(ciphertext_hex).map_err(|e| format!("failed to hex-decode ciphertext: {e}"))?;
    let private_key = private_key
        .parse::<PrivateKey<Testnet2Parameters>>()
        .map_err(|e| format!("failed to parse private key: {e}"))?;
    let decryption_key = private_key
        .to_decryption_key()
        .map_err(|e| format!("failed to create decryption key: {e}"))?;

    let scheme = Testnet2Parameters::account_encryption_scheme();
    let Ok(plaintext) = scheme.decrypt(&decryption_key, ciphertext.as_slice()) else {
        return Ok(None);
    };

    Ok(Some(
        String::from_utf8(plaintext.to_owned())
            .map(|s| s.to_owned())
            .unwrap_or_else(|_| plaintext.encode_hex::<String>()),
    ))
}

#[wasm_bindgen]
pub fn encrypt_str(address: &str, plaintext: &str) -> Result<String, String> {
    let scheme = Testnet2Parameters::account_encryption_scheme();
    let address = address
        .parse::<Address<Testnet2Parameters>>()
        .map_err(|e| format!("failed to parse address: {e}"))?;
    let pubkey = address.to_encryption_key();
    let randomness = scheme
        .generate_randomness(pubkey, &mut rand::thread_rng())
        .map_err(|e| format!("failed to generate randomness: {e}"))?;
    let ciphertext = scheme
        .encrypt(pubkey, &randomness, plaintext.as_bytes())
        .map_err(|e| format!("failed to encrypt text: {e}"))?;
    Ok(ciphertext.encode_hex::<String>())
}

#[wasm_bindgen]
pub fn gen_account() -> String {
    let private_key = PrivateKey::<Testnet2Parameters>::new(&mut rand::thread_rng());
    let address = Address::from_private_key(&private_key).unwrap();

    format!("{{\"privateKey\": \"{private_key}\", \"address\": \"{address}\"}}")
}
