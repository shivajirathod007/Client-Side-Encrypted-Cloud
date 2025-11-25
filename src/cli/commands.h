#pragma once

#include <string>
#include <vector>

namespace cli {

class Commands {
public:
    static void backup(const std::string& file_path, size_t chunk_size);
    static void verify(const std::string& manifest_path);
    static void help();
};

} // namespace cli
