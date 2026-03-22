export interface TenantTheme {
  colors: {
    primary: string;      // e.g., "#2563EB"
    secondary: string;    // e.g., "#7C3AED"
    accent: string;       // e.g., "#F59E0B"
    background: string;   // e.g., "#FFFFFF"
    text: string;         // e.g., "#111827"
  };
  fonts: {
    heading: string;      // e.g., "Inter"
    body: string;         // e.g., "Inter"
  };
  logo?: string;          // S3 URL to logo image
  favicon?: string;       // S3 URL to favicon
  borderRadius?: string;  // e.g., "8px"
}
