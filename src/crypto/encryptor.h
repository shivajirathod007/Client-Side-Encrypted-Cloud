#pragma once

#include <vector>
#include <array>
#include <cstdint>

namespace crypto {

struct CipherResult {
    std::vector<uint8_t> ciphertext;
    std::array<uint8_t, 16> tag;
    std::array<uint8_t, 12> iv;
};

class Encryptor {
public:
    Encryptor(const std::array<uint8_t, 32>& key);
    ~Encryptor();

    CipherResult encrypt(const uint8_t* plaintext, size_t len);
    std::vector<uint8_t> decrypt(const CipherResult& res);

private:
    std::array<uint8_t, 32> key_;
};

} // namespace crypto
