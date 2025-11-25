#include "key_manager.h"
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <openssl/kdf.h>
#include <stdexcept>
#include <cstring>

namespace crypto {

KeyManager::KeyManager(const std::string& passphrase, const KeyDerivationParams& params)
    : passphrase_(passphrase), params_(params) {
    if (params_.salt.empty()) {
        throw std::invalid_argument("Salt cannot be empty");
    }
}

KeyManager::~KeyManager() {
    zeroize();
}

std::vector<uint8_t> KeyManager::derive_master_key() {
    master_key_.resize(params_.key_length);

    int res = PKCS5_PBKDF2_HMAC(
        passphrase_.c_str(), static_cast<int>(passphrase_.length()),
        params_.salt.data(), static_cast<int>(params_.salt.size()),
        params_.iterations,
        EVP_sha256(),
        params_.key_length,
        master_key_.data()
    );

    if (res != 1) {
        throw std::runtime_error("PBKDF2 derivation failed");
    }

    return master_key_;
}

std::array<uint8_t, 32> KeyManager::get_master_key() {
    if (master_key_.empty()) {
        derive_master_key();
    }
    std::array<uint8_t, 32> key_array;
    if (master_key_.size() != 32) {
        throw std::runtime_error("Master key size mismatch");
    }
    std::memcpy(key_array.data(), master_key_.data(), 32);
    return key_array;
}

void KeyManager::zeroize() {
    if (!master_key_.empty()) {
        OPENSSL_cleanse(master_key_.data(), master_key_.size());
        master_key_.clear();
    }
    OPENSSL_cleanse(const_cast<char*>(passphrase_.data()), passphrase_.size());
    // Note: std::string might have copies, but we do our best
}

} // namespace crypto
