#include "merkle_tree.h"
#include <openssl/sha.h>
#include <sstream>
#include <iomanip>
#include <algorithm>

namespace merkle {

std::string MerkleTree::compute_root(const std::vector<std::string>& leaf_hashes) {
    if (leaf_hashes.empty()) {
        return "";
    }

    std::vector<std::string> current_level = leaf_hashes;

    // Hash leaves with 0x00 prefix if they are raw data, but here we assume they are already hashes?
    // Requirement says: "hash of ciphertext".
    // "canonicalization (0x00 leaf / 0x01 node)" usually applies when hashing the content itself.
    // If leaf_hashes are already SHA256 strings, we should treat them as inputs to the tree.
    // Let's assume we need to re-hash them with prefix to form the tree leaves.
    
    std::vector<std::string> tree_nodes;
    for (const auto& h : leaf_hashes) {
        tree_nodes.push_back(hash_leaf(h));
    }

    while (tree_nodes.size() > 1) {
        std::vector<std::string> next_level;
        for (size_t i = 0; i < tree_nodes.size(); i += 2) {
            if (i + 1 < tree_nodes.size()) {
                next_level.push_back(hash_node(tree_nodes[i], tree_nodes[i+1]));
            } else {
                // Odd number of nodes, duplicate the last one? Or just promote it?
                // Common practice: duplicate last.
                next_level.push_back(hash_node(tree_nodes[i], tree_nodes[i]));
            }
        }
        tree_nodes = next_level;
    }

    return tree_nodes[0];
}

std::string MerkleTree::hash_leaf(const std::string& data) {
    // Prefix 0x00
    std::string input;
    input.push_back(0x00);
    input += data;
    return sha256(input);
}

std::string MerkleTree::hash_node(const std::string& left, const std::string& right) {
    // Prefix 0x01
    std::string input;
    input.push_back(0x01);
    input += left + right;
    return sha256(input);
}

std::string MerkleTree::sha256(const std::string& data) {
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256_CTX sha256;
    SHA256_Init(&sha256);
    SHA256_Update(&sha256, data.c_str(), data.size());
    SHA256_Final(hash, &sha256);

    std::stringstream ss;
    for (int i = 0; i < SHA256_DIGEST_LENGTH; i++) {
        ss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
    }
    return ss.str();
}

} // namespace merkle
