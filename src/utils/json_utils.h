#pragma once

#include <string>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

namespace utils {

class JsonUtils {
public:
    static std::string serialize(const json& j);
    static json deserialize(const std::string& s);
    static json read_from_file(const std::string& path);
    static void write_to_file(const std::string& path, const json& j);
};

} // namespace utils
