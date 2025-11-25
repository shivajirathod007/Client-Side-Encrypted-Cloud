cmake_minimum_required(VERSION 3.15)
project(SecureBackupClient VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Dependencies
find_package(OpenSSL REQUIRED)
find_package(CURL REQUIRED)
# nlohmann_json and sqlite3 might need to be added via FetchContent or assumed installed.
# For this environment, we'll assume they are available or use a simple find_package/library approach.
# If not found, we might need to mock or fetch them.
find_package(nlohmann_json QUIET)
find_package(SQLite3 QUIET)

# Include directories
include_directories(include)
include_directories(src)

# Subdirectories
add_subdirectory(src)
add_subdirectory(tests)

# Compiler warnings
if(MSVC)
    add_compile_options(/W4)
else()
    add_compile_options(-Wall -Wextra -Wpedantic)
endif()
