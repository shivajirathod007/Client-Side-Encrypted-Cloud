#pragma once

#include <string>
#include <vector>
#include <fstream>
#include <filesystem>

namespace fs = std::filesystem;

namespace utils {

class FileUtils {
public:
    static bool exists(const std::string& path);
    static size_t get_file_size(const std::string& path);
    static std::vector<uint8_t> read_file(const std::string& path);
    static void write_file(const std::string& path, const std::vector<uint8_t>& data);
    static void write_file(const std::string& path, const std::string& data);
    static void create_directory(const std::string& path);
    static void remove_file(const std::string& path);
    static std::string get_filename(const std::string& path);
};

} // namespace utils
