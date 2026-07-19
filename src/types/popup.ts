export interface Popup {
  id: string;
  name: string;
  category: string;
  address?: string;
  lat: number;
  lng: number;
  startDate?: string | Date;
  endDate?: string | Date;
  status: string;
  images: string[];
  description?: string | null;
  sourceUrl?: string | null;
}
