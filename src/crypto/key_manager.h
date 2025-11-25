#pragma once

#include <string>
#include <vector>
#include <array>
#include <cstdint>

namespace crypto {

struct KeyDerivationParams {
    std::vector<uint8_t> salt;
    int iterations = 100000;
    int key_length = 32;
};

class KeyManager {
public:
    KeyManager(const std::string& passphrase, const KeyDerivationParams& params);
    ~KeyManager();

    std::vector<uint8_t> derive_master_key();
    std::array<uint8_t, 32> get_master_key();

    // Securely clear memory
    void zeroize();

private:
    std::string passphrase_;
    KeyDerivationParams params_;
    std::vector<uint8_t> master_key_;
};

} // namespace crypto
