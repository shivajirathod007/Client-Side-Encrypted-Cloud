#include "ledger.h"
#include "../utils/file_utils.h"
#include "../utils/json_utils.h"
#include <openssl/sha.h>
#include <sstream>
#include <iomanip>
#include <ctime>
#include <iostream>

namespace ledger {

Ledger::Ledger(const std::string& db_path) : db_path_(db_path) {
    load();
}

void Ledger::load() {
    if (utils::FileUtils::exists(db_path_)) {
        try {
            ledger_data_ = utils::JsonUtils::read_from_file(db_path_);
        } catch (...) {
            ledger_data_ = json::array();
        }
    } else {
        ledger_data_ = json::array();
    }
}

void Ledger::save() {
    utils::JsonUtils::write_to_file(db_path_, ledger_data_);
}

void Ledger::append_event(const json& payload) {
    std::string prev_hash = "0000000000000000000000000000000000000000000000000000000000000000";
    if (!ledger_data_.empty()) {
        prev_hash = ledger_data_.back()["entry_hash"];
    }

    // Get current timestamp
    std::time_t now = std::time(nullptr);
    char buf[100];
    std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", std::gmtime(&now));
    std::string ts = buf;

    std::string payload_str = payload.dump();
    std::string entry_hash = calculate_entry_hash(prev_hash, payload_str, ts);

    json entry;
    entry["prev_hash"] = prev_hash;
    entry["payload"] = payload;
    entry["ts"] = ts;
    entry["entry_hash"] = entry_hash;

    ledger_data_.push_back(entry);
    save();
}

std::string Ledger::get_latest_root() {
    if (ledger_data_.empty()) return "";
    // Assuming the payload contains "merkle_root"
    // Search backwards for the last backup event
    for (auto it = ledger_data_.rbegin(); it != ledger_data_.rend(); ++it) {
        if ((*it)["payload"].contains("merkle_root")) {
            return (*it)["payload"]["merkle_root"];
        }
    }
    return "";
}

bool Ledger::verify_chain() {
    std::string prev_hash = "0000000000000000000000000000000000000000000000000000000000000000";
    for (const auto& entry : ledger_data_) {
        if (entry["prev_hash"] != prev_hash) {
            return false;
        }
        std::string calculated = calculate_entry_hash(
            entry["prev_hash"], 
            entry["payload"].dump(), 
            entry["ts"]
        );
        if (calculated != entry["entry_hash"]) {
            return false;
        }
        prev_hash = entry["entry_hash"];
    }
    return true;
}

std::string Ledger::calculate_entry_hash(const std::string& prev_hash, const std::string& payload_str, const std::string& ts) {
    return sha256(prev_hash + payload_str + ts);
}

std::string Ledger::sha256(const std::string& data) {
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256_CTX sha256;
    SHA256_Init(&sha256);
    SHA256_Update(&sha256, data.c_str(), data.size());
    SHA256_Final(hash, &sha256);

    std::stringstream ss;
    for (int i = 0; i < SHA256_DIGEST_LENGTH; i++) {
        ss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
    }
    return ss.str();
}

} // namespace ledger
