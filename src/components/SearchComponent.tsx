import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Airport } from "../../hooks/useAirports"; // Adjust path based on your project structure

interface SearchComponentProps {
  showSearch: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchType: "airports" | "events";
  setSearchType: (type: "airports" | "events") => void;
  setShowSearch: (show: boolean) => void;
  selectedAirport: Airport | null;
  topBarHeight: number;
}

const { width } = Dimensions.get("window");

const SearchComponent: React.FC<SearchComponentProps> = ({
  showSearch,
  searchQuery,
  setSearchQuery,
  searchType,
  setSearchType,
  setShowSearch,
  selectedAirport,
  topBarHeight,
}) => {
  return (
    <>
      {showSearch ? (
        <View style={[styles.searchHeader, { top: topBarHeight }]}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${searchType}...`}
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowSearch(false)}
            >
              <Feather name="x" size={24} color="#2F80ED" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setSearchType("airports")}
            >
              <View
                style={[
                  styles.filterButtonInner,
                  {
                    backgroundColor:
                      searchType === "airports" ? "#2F80ED" : "#F1F5F9",
                  },
                ]}
              >
                <Feather
                  name="airplay"
                  size={18}
                  color={searchType === "airports" ? "#FFFFFF" : "#64748B"}
                />
                <Text
                  style={[
                    styles.filterText,
                    {
                      color:
                        searchType === "airports" ? "#FFFFFF" : "#64748B",
                    },
                  ]}
                >
                  Airports
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setSearchType("events")}
            >
              <View
                style={[
                  styles.filterButtonInner,
                  {
                    backgroundColor:
                      searchType === "events" ? "#2F80ED" : "#F1F5F9",
                  },
                ]}
              >
                <Feather
                  name="calendar"
                  size={18}
                  color={searchType === "events" ? "#FFFFFF" : "#64748B"}
                />
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: searchType === "events" ? "#FFFFFF" : "#64748B",
                    },
                  ]}
                >
                  Events
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setShowSearch(true)}
          style={[styles.defaultSearchContainer, { top: topBarHeight }]}
        >
          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color="#64748B" />
            <Text style={styles.searchPlaceholder}>
              {selectedAirport ? selectedAirport.name : "Select an airport"}
            </Text>
            <Feather
              name="chevron-down"
              size={20}
              color="#64748B"
              style={styles.searchIcon}
            />
          </View>
        </TouchableOpacity>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  searchHeader: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
    paddingVertical: 8,
  },
  cancelButton: {
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: "row",
    marginTop: 12,
  },
  filterButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  filterButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    padding: 12,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  defaultSearchContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 2,
  },
  searchContainer: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: "#64748B",
    marginLeft: 8,
  },
  searchIcon: {
    marginLeft: 8,
  },
});

export default SearchComponent;