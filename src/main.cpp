#include "cli/commands.h"
#include <iostream>
#include <string>
#include <cstdlib>

int main(int argc, char* argv[]) {
    if (argc < 2) {
        cli::Commands::help();
        return 1;
    }

    std::string command = argv[1];

    if (command == "backup") {
        if (argc < 3) {
            std::cerr << "Error: Missing file path." << std::endl;
            cli::Commands::help();
            return 1;
        }
        std::string file_path = argv[2];
        size_t chunk_size = 16 * 1024 * 1024; // Default 16MB
        if (argc >= 4) {
            chunk_size = std::stoul(argv[3]) * 1024 * 1024;
        }
        cli::Commands::backup(file_path, chunk_size);
    } else if (command == "verify") {
        if (argc < 3) {
            std::cerr << "Error: Missing manifest path." << std::endl;
            cli::Commands::help();
            return 1;
        }
        std::string manifest_path = argv[2];
        cli::Commands::verify(manifest_path);
    } else {
        std::cerr << "Unknown command: " << command << std::endl;
        cli::Commands::help();
        return 1;
    }

    return 0;
}
