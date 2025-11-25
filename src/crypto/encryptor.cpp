#include "encryptor.h"
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <openssl/err.h>
#include <stdexcept>
#include <cstring>

namespace crypto {

Encryptor::Encryptor(const std::array<uint8_t, 32>& key) : key_(key) {}

Encryptor::~Encryptor() {
    OPENSSL_cleanse(key_.data(), key_.size());
}

CipherResult Encryptor::encrypt(const uint8_t* plaintext, size_t len) {
    CipherResult res;
    
    // Generate random IV
    if (RAND_bytes(res.iv.data(), res.iv.size()) != 1) {
        throw std::runtime_error("Failed to generate random IV");
    }

    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) throw std::runtime_error("Failed to create cipher context");

    int outlen;
    int ciphertext_len = 0;
    
    // Reserve space for ciphertext (input length + block size is safe upper bound)
    res.ciphertext.resize(len + EVP_MAX_BLOCK_LENGTH);

    try {
        if (1 != EVP_EncryptInit_ex(ctx, EVP_aes_256_gcm(), NULL, NULL, NULL))
            throw std::runtime_error("EncryptInit failed");

        if (1 != EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, static_cast<int>(res.iv.size()), NULL))
            throw std::runtime_error("Set IV length failed");

        if (1 != EVP_EncryptInit_ex(ctx, NULL, NULL, key_.data(), res.iv.data()))
            throw std::runtime_error("EncryptInit key/iv failed");

        if (1 != EVP_EncryptUpdate(ctx, res.ciphertext.data(), &outlen, plaintext, static_cast<int>(len)))
            throw std::runtime_error("EncryptUpdate failed");
        
        ciphertext_len = outlen;

        if (1 != EVP_EncryptFinal_ex(ctx, res.ciphertext.data() + outlen, &outlen))
            throw std::runtime_error("EncryptFinal failed");
        
        ciphertext_len += outlen;
        res.ciphertext.resize(ciphertext_len);

        if (1 != EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, 16, res.tag.data()))
            throw std::runtime_error("Get tag failed");

    } catch (...) {
        EVP_CIPHER_CTX_free(ctx);
        throw;
    }

    EVP_CIPHER_CTX_free(ctx);
    return res;
}

std::vector<uint8_t> Encryptor::decrypt(const CipherResult& res) {
    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) throw std::runtime_error("Failed to create cipher context");

    std::vector<uint8_t> plaintext;
    plaintext.resize(res.ciphertext.size());
    int outlen;
    int plaintext_len = 0;

    try {
        if (1 != EVP_DecryptInit_ex(ctx, EVP_aes_256_gcm(), NULL, NULL, NULL))
            throw std::runtime_error("DecryptInit failed");

        if (1 != EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, static_cast<int>(res.iv.size()), NULL))
            throw std::runtime_error("Set IV length failed");

        if (1 != EVP_DecryptInit_ex(ctx, NULL, NULL, key_.data(), res.iv.data()))
            throw std::runtime_error("DecryptInit key/iv failed");

        if (1 != EVP_DecryptUpdate(ctx, plaintext.data(), &outlen, res.ciphertext.data(), static_cast<int>(res.ciphertext.size())))
            throw std::runtime_error("DecryptUpdate failed");
        
        plaintext_len = outlen;

        if (1 != EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_TAG, 16, const_cast<uint8_t*>(res.tag.data())))
            throw std::runtime_error("Set tag failed");

        int ret = EVP_DecryptFinal_ex(ctx, plaintext.data() + outlen, &outlen);
        
        if (ret <= 0) {
            throw std::runtime_error("Decryption failed (tag mismatch or other error)");
        }
        
        plaintext_len += outlen;
        plaintext.resize(plaintext_len);

    } catch (...) {
        EVP_CIPHER_CTX_free(ctx);
        throw;
    }

    EVP_CIPHER_CTX_free(ctx);
    return plaintext;
}

} // namespace crypto
