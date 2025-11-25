#pragma once

#include <string>
#include <vector>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

namespace ledger {

struct ChunkInfo {
    uint64_t id;
    std::string hash;
    std::string iv;
    std::string uri;
};

struct Manifest {
    std::string file_name;
    size_t original_size;
    size_t chunk_size;
    std::vector<ChunkInfo> chunks;
    std::string merkle_root;
    std::string timestamp;
    int version = 1;

    json to_json() const;
    static Manifest from_json(const json& j);
};

} // namespace ledger
