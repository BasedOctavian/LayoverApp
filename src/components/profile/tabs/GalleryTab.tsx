import React from "react";
import { View, Text, TouchableOpacity, Image, Animated, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface GalleryTabProps {
  galleryImages: string[];
  authUser: any;
  id: string;
  theme: "light" | "dark";
  tabFadeAnim: Animated.Value;
  tabScaleAnim: Animated.Value;
  uploadingGalleryImage: boolean;
  loadingGalleryImages: Set<number>;
  onGalleryImageUpload: () => void;
  onPhotoPress: (photos: string[], index: number) => void;
  onDeleteGalleryImage: (index: number) => void;
  setLoadingGalleryImages: React.Dispatch<React.SetStateAction<Set<number>>>;
}

const GalleryTab: React.FC<GalleryTabProps> = ({
  galleryImages,
  authUser,
  id,
  theme,
  tabFadeAnim,
  tabScaleAnim,
  uploadingGalleryImage,
  loadingGalleryImages,
  onGalleryImageUpload,
  onPhotoPress,
  onDeleteGalleryImage,
  setLoadingGalleryImages,
}) => {
  return (
    <Animated.View style={[styles.tabContent, { opacity: tabFadeAnim, transform: [{ scale: tabScaleAnim }] }]}>
      <View style={[styles.card, styles.galleryCard, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
        shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
        shadowOpacity: theme === "light" ? 0.2 : 0.1,
      }]}>
        <View style={styles.galleryHeader}>
          <View style={styles.galleryTitleContainer}>
            <MaterialIcons name="photo-library" size={24} color="#37a4c8" style={styles.headerIcon} />
            <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>Photo Gallery</Text>
            <Text style={[styles.galleryCount, { color: theme === "light" ? "#666666" : "#999999" }]}>
              {galleryImages.length} photo{galleryImages.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {id === authUser?.uid && (
            <TouchableOpacity
              style={[styles.addPhotoButton, { 
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.2)",
                borderColor: "#37a4c8",
              }]}
              onPress={onGalleryImageUpload}
              disabled={uploadingGalleryImage}
              activeOpacity={0.7}
            >
              {uploadingGalleryImage ? (
                <ActivityIndicator size="small" color="#37a4c8" />
              ) : (
                <MaterialIcons name="add-photo-alternate" size={18} color="#37a4c8" />
              )}
              <Text style={[styles.addPhotoText, { color: "#37a4c8" }]}>
                {uploadingGalleryImage ? "Uploading..." : "Add"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {galleryImages.length > 0 ? (
          <View style={styles.galleryGrid}>
            {galleryImages.map((image, index) => (
              <View
                key={index}
                style={[styles.galleryImageContainer, { 
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.1)",
                  borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)",
                }]}
              >
                <TouchableOpacity
                  style={styles.galleryImageTouchable}
                  onPress={() => onPhotoPress(galleryImages, index)}
                  activeOpacity={0.8}
                >
                  <Image 
                    source={{ uri: image }} 
                    style={styles.galleryImage}
                    resizeMode="cover"
                    onLoadStart={() => {
                      setLoadingGalleryImages(prev => new Set(prev).add(index));
                    }}
                    onLoad={() => {
                      setLoadingGalleryImages(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(index);
                        return newSet;
                      });
                    }}
                    onError={() => {
                      setLoadingGalleryImages(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(index);
                        return newSet;
                      });
                    }}
                  />
                  {loadingGalleryImages.has(index) && (
                    <View style={styles.imageLoadingOverlay}>
                      <ActivityIndicator size="small" color="#37a4c8" />
                    </View>
                  )}
                  <View style={styles.imageOverlay}>
                    <MaterialIcons name="zoom-in" size={20} color="#ffffff" />
                  </View>
                </TouchableOpacity>
                
                {id === authUser?.uid && (
                  <TouchableOpacity
                    style={[styles.deleteImageButton, { 
                      backgroundColor: theme === "light" ? "rgba(255, 68, 68, 0.9)" : "rgba(255, 102, 102, 0.9)",
                    }]}
                    onPress={() => onDeleteGalleryImage(index)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="delete" size={16} color="#ffffff" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyGalleryContainer, { 
            backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.1)",
            borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)",
          }]}>
            <MaterialIcons name="photo-library" size={48} color={theme === "light" ? "#94A3B8" : "#666666"} />
            <Text style={[styles.emptyGalleryText, { color: theme === "light" ? "#666666" : "#999999" }]}>
              {id === authUser?.uid ? "No photos in gallery yet" : "No photos in gallery"}
            </Text>
            <Text style={[styles.emptyGallerySubtext, { color: theme === "light" ? "#94A3B8" : "#666666" }]}>
              {id === authUser?.uid ? "Add some photos to showcase yourself!" : "This user hasn't added any photos yet."}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = {
  tabContent: {
    marginTop: 16,
  },
  card: {
    borderRadius: 20,
    padding: 28,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOpacity: 0.12,
    overflow: 'hidden',
  },
  galleryCard: {
    marginBottom: 20,
    overflow: 'hidden',
    width: '100%',
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  galleryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 0,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  headerIcon: {
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  galleryCount: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
    opacity: 0.7,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 2,
    gap: 6,
    minWidth: 80,
    maxWidth: 110,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 0,
    width: '100%',
  },
  galleryImageContainer: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    marginBottom: 10,
    position: 'relative',
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    minWidth: 0,
    maxWidth: '48%',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  galleryImageTouchable: {
    flex: 1,
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  deleteImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  emptyGalleryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyGalleryText: {
    fontSize: 17,
    marginTop: 18,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  emptyGallerySubtext: {
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 0.1,
  },
} as any;

export default GalleryTab;

