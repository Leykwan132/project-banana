import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

type UploadableProofFile = {
  uri: string;
  type: 'image' | 'pdf';
  mimeType?: string;
};

type PreparedProofUpload = {
  uri: string;
  contentType: string;
};

export async function prepareBankProofUpload(
  file: UploadableProofFile,
): Promise<PreparedProofUpload> {
  if (file.type === 'pdf') {
    return {
      uri: file.uri,
      contentType: file.mimeType ?? 'application/pdf',
    };
  }

  const convertedImage = await manipulateAsync(file.uri, [], {
    compress: 1,
    format: SaveFormat.PNG,
  });

  return {
    uri: convertedImage.uri,
    contentType: 'image/png',
  };
}
