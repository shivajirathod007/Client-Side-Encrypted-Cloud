#pragma once

#include <string>
#include <vector>

namespace storage {

class Downloader {
public:
    Downloader();
    ~Downloader();

    // Downloads data from a URI
    std::vector<uint8_t> download(const std::string& uri);

private:
    static size_t write_callback(void* contents, size_t size, size_t nmemb, void* userp);
};

} // namespace storage
