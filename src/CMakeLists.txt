add_library(secure_backup_lib
    utils/file_utils.cpp
    utils/json_utils.cpp
    chunker/chunker.cpp
    # Add other sources as they are implemented
    # crypto/key_manager.cpp
    # crypto/encryptor.cpp
    # ledger/ledger.cpp
    # storage/uploader.cpp
    # storage/downloader.cpp
    # cli/commands.cpp
)

target_link_libraries(secure_backup_lib
    PRIVATE
    OpenSSL::SSL
    OpenSSL::Crypto
    CURL::libcurl
    # nlohmann_json::nlohmann_json
    # SQLite::SQLite3
)

# If nlohmann_json is header-only and installed globally or found via find_package
if(TARGET nlohmann_json::nlohmann_json)
    target_link_libraries(secure_backup_lib PRIVATE nlohmann_json::nlohmann_json)
endif()

# If sqlite3 is found
if(TARGET SQLite::SQLite3)
    target_link_libraries(secure_backup_lib PRIVATE SQLite::SQLite3)
endif()

add_executable(secure_backup_cli main.cpp cli/commands.cpp)
target_link_libraries(secure_backup_cli PRIVATE secure_backup_lib)
