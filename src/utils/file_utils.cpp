#include "file_utils.h"
#include <stdexcept>
#include <iostream>

namespace utils {

bool FileUtils::exists(const std::string& path) {
    return fs::exists(path);
}

size_t FileUtils::get_file_size(const std::string& path) {
    if (!exists(path)) {
        throw std::runtime_error("File not found: " + path);
    }
    return fs::file_size(path);
}

std::vector<uint8_t> FileUtils::read_file(const std::string& path) {
    if (!exists(path)) {
        throw std::runtime_error("File not found: " + path);
    }
    std::ifstream file(path, std::ios::binary);
    if (!file) {
        throw std::runtime_error("Failed to open file for reading: " + path);
    }
    return std::vector<uint8_t>((std::istreambuf_iterator<char>(file)),
                                 std::istreambuf_iterator<char>());
}

void FileUtils::write_file(const std::string& path, const std::vector<uint8_t>& data) {
    std::ofstream file(path, std::ios::binary);
    if (!file) {
        throw std::runtime_error("Failed to open file for writing: " + path);
    }
    file.write(reinterpret_cast<const char*>(data.data()), data.size());
}

void FileUtils::write_file(const std::string& path, const std::string& data) {
    std::ofstream file(path);
    if (!file) {
        throw std::runtime_error("Failed to open file for writing: " + path);
    }
    file << data;
}

void FileUtils::create_directory(const std::string& path) {
    if (!fs::exists(path)) {
        fs::create_directories(path);
    }
}

void FileUtils::remove_file(const std::string& path) {
    if (fs::exists(path)) {
        fs::remove(path);
    }
}

std::string FileUtils::get_filename(const std::string& path) {
    return fs::path(path).filename().string();
}

} // namespace utils
