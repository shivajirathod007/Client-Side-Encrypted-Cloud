#pragma once

#include <vector>
#include <string>
#include <array>

namespace merkle {

class MerkleTree {
public:
    // Compute Merkle root from a list of leaf hashes (already hashed chunks)
    static std::string compute_root(const std::vector<std::string>& leaf_hashes);

private:
    static std::string hash_leaf(const std::string& data);
    static std::string hash_node(const std::string& left, const std::string& right);
    static std::string sha256(const std::string& data);
};

} // namespace merkle
