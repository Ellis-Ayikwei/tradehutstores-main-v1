import axios from "axios";

const downloadResource = async (resource) => {
  const url = resource.url;
  const name = resource.name || 'downloaded-file';

  console.log("Attempting to download resource:", name, url);

  if (!url) {
    console.error('Resource URL is missing.');
    toast.error('Resource URL is missing.');
    return;
  }

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`Failed to fetch resource: ${response.statusText}`);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(resource);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Download error:', error);
    toast.error(`An error occurred while downloading the resource: ${error.message}`);
  }
};

export default downloadResource;