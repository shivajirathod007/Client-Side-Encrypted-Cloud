#include "chunker.h"
#include "../utils/file_utils.h"
#include <stdexcept>

namespace chunker {

Chunker::Chunker(const std::string& path, size_t chunk_size)
    : file_path_(path), chunk_size_(chunk_size), current_chunk_id_(0), bytes_read_(0) {
    
    if (!utils::FileUtils::exists(path)) {
        throw std::runtime_error("File not found: " + path);
    }
    
    file_size_ = utils::FileUtils::get_file_size(path);
    file_.open(path, std::ios::binary);
    
    if (!file_) {
        throw std::runtime_error("Failed to open file: " + path);
    }
}

Chunker::~Chunker() {
    if (file_.is_open()) {
        file_.close();
    }
}

bool Chunker::hasNext() {
    return file_.peek() != EOF && bytes_read_ < file_size_;
}

Chunk Chunker::next() {
    if (!hasNext()) {
        throw std::runtime_error("No more chunks available");
    }

    Chunk chunk;
    chunk.id = current_chunk_id_++;
    chunk.data.resize(chunk_size_);

    file_.read(reinterpret_cast<char*>(chunk.data.data()), chunk_size_);
    chunk.size = static_cast<size_t>(file_.gcount());
    
    // Resize vector to actual bytes read if it's the last chunk
    if (chunk.size < chunk_size_) {
        chunk.data.resize(chunk.size);
    }

    bytes_read_ += chunk.size;
    return chunk;
}

} // namespace chunker
