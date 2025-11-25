#pragma once

#include <string>
#include <vector>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

namespace ledger {

class Ledger {
public:
    Ledger(const std::string& db_path);
    
    // Append a new event (e.g., backup manifest)
    void append_event(const json& payload);
    
    // Get the latest Merkle root from the ledger (if applicable)
    std::string get_latest_root();
    
    // Verify the hash chain integrity
    bool verify_chain();

private:
    std::string db_path_;
    json ledger_data_;
    
    void load();
    void save();
    std::string calculate_entry_hash(const std::string& prev_hash, const std::string& payload_str, const std::string& ts);
    std::string sha256(const std::string& data);
};

} // namespace ledger
