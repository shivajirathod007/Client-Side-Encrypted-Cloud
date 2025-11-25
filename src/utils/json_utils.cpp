#include "json_utils.h"
#include "file_utils.h"
#include <fstream>

namespace utils {

std::string JsonUtils::serialize(const json& j) {
    return j.dump(4); // Pretty print with 4 spaces
}

json JsonUtils::deserialize(const std::string& s) {
    return json::parse(s);
}

json JsonUtils::read_from_file(const std::string& path) {
    std::ifstream file(path);
    if (!file) {
        throw std::runtime_error("Failed to open JSON file: " + path);
    }
    json j;
    file >> j;
    return j;
}

void JsonUtils::write_to_file(const std::string& path, const json& j) {
    std::ofstream file(path);
    if (!file) {
        throw std::runtime_error("Failed to open JSON file for writing: " + path);
    }
    file << j.dump(4);
}

} // namespace utils
