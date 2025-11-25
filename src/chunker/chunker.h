#pragma once

#include <string>
#include <vector>
#include <fstream>
#include <cstdint>

namespace chunker {

struct Chunk {
    uint64_t id;
    std::vector<uint8_t> data;
    size_t size;
};

class Chunker {
public:
    Chunker(const std::string& path, size_t chunk_size = 16 * 1024 * 1024);
    ~Chunker();

    bool hasNext();
    Chunk next();

private:
    std::string file_path_;
    size_t chunk_size_;
    std::ifstream file_;
    uint64_t current_chunk_id_;
    size_t file_size_;
    size_t bytes_read_;
};

} // namespace chunker
