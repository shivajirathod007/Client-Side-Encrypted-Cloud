#include "uploader.h"
#include <curl/curl.h>
#include <stdexcept>
#include <iostream>

namespace storage {

Uploader::Uploader(const std::string& base_url) : base_url_(base_url) {
    curl_global_init(CURL_GLOBAL_ALL);
}

Uploader::~Uploader() {
    curl_global_cleanup();
}

size_t Uploader::write_callback(void* contents, size_t size, size_t nmemb, void* userp) {
    ((std::string*)userp)->append((char*)contents, size * nmemb);
    return size * nmemb;
}

std::string Uploader::upload_chunk(const std::vector<uint8_t>& data, const std::string& chunk_name) {
    return perform_post(base_url_ + "/upload", data, chunk_name);
}

std::string Uploader::upload_manifest(const std::string& manifest_json) {
    return perform_post_json(base_url_ + "/manifest", manifest_json);
}

std::string Uploader::perform_post(const std::string& url, const std::vector<uint8_t>& data, const std::string& filename) {
    CURL* curl;
    CURLcode res;
    std::string readBuffer;

    curl = curl_easy_init();
    if (curl) {
        curl_mime* mime;
        curl_mimepart* part;

        mime = curl_mime_init(curl);

        part = curl_mime_addpart(mime);
        curl_mime_name(part, "chunk");
        curl_mime_data(part, reinterpret_cast<const char*>(data.data()), data.size());
        curl_mime_filename(part, filename.c_str());

        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_MIMEPOST, mime);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &readBuffer);

        res = curl_easy_perform(curl);
        if (res != CURLE_OK) {
            std::string error_msg = curl_easy_strerror(res);
            curl_easy_cleanup(curl);
            curl_mime_free(mime);
            throw std::runtime_error("CURL upload failed: " + error_msg);
        }

        curl_easy_cleanup(curl);
        curl_mime_free(mime);
    } else {
        throw std::runtime_error("Failed to init CURL");
    }
    
    // Parse response to get URI (assuming server returns JSON { "uri": "..." })
    // Simple string search for now to avoid dependency here if possible, but we have nlohmann/json
    // Let's assume the caller parses it or we return the raw response body which is JSON.
    // Actually, let's parse it here if we can, but for simplicity let's return the raw body or just the URI if we parse it.
    // The requirement says "Return a stable URI/CID".
    // I'll return the raw JSON response for now, and the caller can parse it.
    return readBuffer; 
}

std::string Uploader::perform_post_json(const std::string& url, const std::string& json_data) {
    CURL* curl;
    CURLcode res;
    std::string readBuffer;

    curl = curl_easy_init();
    if (curl) {
        struct curl_slist* headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");

        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, json_data.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &readBuffer);

        res = curl_easy_perform(curl);
        if (res != CURLE_OK) {
            std::string error_msg = curl_easy_strerror(res);
            curl_easy_cleanup(curl);
            curl_slist_free_all(headers);
            throw std::runtime_error("CURL json upload failed: " + error_msg);
        }

        curl_easy_cleanup(curl);
        curl_slist_free_all(headers);
    } else {
        throw std::runtime_error("Failed to init CURL");
    }
    return readBuffer;
}

} // namespace storage
