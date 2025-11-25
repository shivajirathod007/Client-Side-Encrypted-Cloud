#pragma once

#include <string>
#include <vector>
#include <functional>

namespace storage {

class Uploader {
public:
    Uploader(const std::string& base_url);
    ~Uploader();

    // Uploads a chunk and returns the URI
    std::string upload_chunk(const std::vector<uint8_t>& data, const std::string& chunk_name);

    // Uploads the manifest
    std::string upload_manifest(const std::string& manifest_json);

private:
    std::string base_url_;
    
    // Helper for curl
    static size_t write_callback(void* contents, size_t size, size_t nmemb, void* userp);
    std::string perform_post(const std::string& url, const std::vector<uint8_t>& data, const std::string& filename);
    std::string perform_post_json(const std::string& url, const std::string& json_data);
};

} // namespace storage
