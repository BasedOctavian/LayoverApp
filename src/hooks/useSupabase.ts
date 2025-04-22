// useSupabase.ts
import { useState } from 'react';
import { supabase } from '../../config/supabaseClient';

// Hook for uploading profile pictures
export const useUploadProfilePic = () => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const uploadProfilePic = async (userId: string, fileUri: string): Promise<string | null> => {
    try {
      setUploading(true);
      setError(null);

      // Convert the local URI to a Blob
      const response = await fetch(fileUri);
      const blob = await response.blob();

      // Use the UID as the file name (no extension)
      const filePath = `${userId}`;

      // Upload the file to the 'profile-pictures' bucket
      const { error: uploadError } = await supabase
        .storage
        .from('profile-pictures')
        .upload(filePath, blob, { 
          upsert: true, // Overwrite if exists
          contentType: blob.type // Preserve original MIME type
        });

      if (uploadError) throw uploadError;

      // Return the public URL
      const { data } = supabase
        .storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, error, uploadProfilePic };
};

// Hook for retrieving profile picture URL
export const useGetProfilePicUrl = () => {
  /**
   * Retrieves the public URL for a profile picture using just the UID.
   * @param uid - The UID of the user (used as the file name).
   * @returns The public URL of the profile picture, or null if it doesn't exist.
   */
  const getProfilePicUrl = async (uid: string): Promise<string | null> => {
    try {
      // Use the UID as the file name (no extension)
      const filePath = `${uid}`;

      // Verify if the file exists using a HEAD request
      const { error } = await supabase
        .storage
        .from('profile-pictures')
        .download(filePath);

      if (error) return null; // File doesn't exist

      // If the file exists, return its public URL
      const { data } = supabase
        .storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      return null;
    }
  };

  return { getProfilePicUrl };
};