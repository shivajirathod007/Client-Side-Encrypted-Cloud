#include "manifest.h"

namespace ledger {

json Manifest::to_json() const {
    json j;
    j["file_name"] = file_name;
    j["original_size"] = original_size;
    j["chunk_size"] = chunk_size;
    j["merkle_root"] = merkle_root;
    j["timestamp"] = timestamp;
    j["version"] = version;

    json chunks_json = json::array();
    for (const auto& chunk : chunks) {
        chunks_json.push_back({
            {"id", chunk.id},
            {"hash", chunk.hash},
            {"iv", chunk.iv},
            {"uri", chunk.uri}
        });
    }
    j["chunks"] = chunks_json;
    return j;
}

Manifest Manifest::from_json(const json& j) {
    Manifest m;
    m.file_name = j.value("file_name", "");
    m.original_size = j.value("original_size", 0ULL);
    m.chunk_size = j.value("chunk_size", 0ULL);
    m.merkle_root = j.value("merkle_root", "");
    m.timestamp = j.value("timestamp", "");
    m.version = j.value("version", 1);

    if (j.contains("chunks")) {
        for (const auto& c : j["chunks"]) {
            ChunkInfo info;
            info.id = c.value("id", 0ULL);
            info.hash = c.value("hash", "");
            info.iv = c.value("iv", "");
            info.uri = c.value("uri", "");
            m.chunks.push_back(info);
        }
    }
    return m;
}

} // namespace ledger
