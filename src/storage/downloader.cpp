#include "downloader.h"
#include <curl/curl.h>
#include <stdexcept>

namespace storage {

Downloader::Downloader() {
    // curl_global_init is handled in Uploader or main, but safe to call multiple times if balanced?
    // Better to have a global init helper. For now, we assume it's initialized.
}

Downloader::~Downloader() {
}

size_t Downloader::write_callback(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t realsize = size * nmemb;
    std::vector<uint8_t>* mem = (std::vector<uint8_t>*)userp;
    size_t old_size = mem->size();
    mem->resize(old_size + realsize);
    std::memcpy(mem->data() + old_size, contents, realsize);
    return realsize;
}

std::vector<uint8_t> Downloader::download(const std::string& uri) {
    CURL* curl;
    CURLcode res;
    std::vector<uint8_t> buffer;

    curl = curl_easy_init();
    if (curl) {
        curl_easy_setopt(curl, CURLOPT_URL, uri.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &buffer);
        curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);

        res = curl_easy_perform(curl);
        if (res != CURLE_OK) {
            std::string error_msg = curl_easy_strerror(res);
            curl_easy_cleanup(curl);
            throw std::runtime_error("CURL download failed: " + error_msg);
        }

        curl_easy_cleanup(curl);
    } else {
        throw std::runtime_error("Failed to init CURL");
    }
    return buffer;
}

} // namespace storage
