import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import UserAvatar from "../UserAvatar";

interface Connection {
  id: string;
  otherUser: {
    id: string;
    name: string;
    profilePicture: string;
    airportCode: string | null;
  };
  createdAt?: any;
}

interface ConnectionsModalProps {
  visible: boolean;
  connections: Connection[];
  theme: "light" | "dark";
  modalOpacityAnim: Animated.Value;
  modalScaleAnim: Animated.Value;
  onClose: () => void;
}

const ConnectionsModal: React.FC<ConnectionsModalProps> = ({
  visible,
  connections,
  theme,
  modalOpacityAnim,
  modalScaleAnim,
  onClose,
}) => {
  const router = useRouter();

  const handleConnectionPress = (connection: Connection) => {
    onClose();
    router.push(`/profile/${connection.otherUser.id}`);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View 
          style={[
            styles.modalContent,
            {
              opacity: modalOpacityAnim,
              transform: [{ scale: modalScaleAnim }],
              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
            }
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <MaterialIcons name="people" size={24} color={theme === "light" ? "#37a4c8" : "#37a4c8"} />
              <Text style={[styles.modalTitle, { color: theme === "light" ? "#000000" : "#ffffff" }]}>
                Connections
              </Text>
            </View>
            <TouchableOpacity 
              onPress={onClose}
              style={[styles.closeButton, { 
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.2)",
              }]}
            >
              <MaterialIcons name="close" size={20} color={theme === "light" ? "#666666" : "#999999"} />
            </TouchableOpacity>
          </View>
          <ScrollView 
            style={styles.connectionsList}
            showsVerticalScrollIndicator={false}
          >
            {connections.length > 0 ? (
              connections.map((connection) => (
                <TouchableOpacity
                  key={connection.id}
                  style={[styles.connectionItem, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.1)",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)",
                  }]}
                  onPress={() => handleConnectionPress(connection)}
                  activeOpacity={0.7}
                >
                  <UserAvatar
                    user={connection.otherUser}
                    size={50}
                    style={styles.connectionAvatar}
                  />
                  <View style={styles.connectionInfo}>
                    <Text style={[styles.connectionItemName, { color: theme === "light" ? "#000000" : "#ffffff" }]}>
                      {connection.otherUser.name}
                    </Text>
                    <Text style={[styles.connectionItemType, { color: theme === "light" ? "#666666" : "#999999" }]}>
                      {connection.otherUser.airportCode || "Unknown Airport"}
                    </Text>
                  </View>
                  <View style={[styles.profileButton, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.2)",
                  }]}>
                    <MaterialIcons 
                      name="person" 
                      size={20} 
                      color={theme === "light" ? "#37a4c8" : "#37a4c8"} 
                    />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={[styles.noConnectionsContainer, { 
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.1)",
                borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)",
              }]}>
                <MaterialIcons name="people" size={48} color={theme === "light" ? "#666666" : "#999999"} />
                <Text style={[styles.noConnectionsText, { color: theme === "light" ? "#666666" : "#999999" }]}>
                  No active connections yet
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = {
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 164, 200, 0.2)',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionsList: {
    padding: 16,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  connectionAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 10,
  },
  connectionItemType: {
    fontSize: 14,
    marginLeft: 10,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  noConnectionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  noConnectionsText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
} as any;

export default ConnectionsModal;

