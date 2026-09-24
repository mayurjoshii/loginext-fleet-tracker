export interface Vehicle {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'offline';
  lat: number;
  lng: number;
  updatedAt: string;
}
