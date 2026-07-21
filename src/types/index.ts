/** Shared TypeScript interfaces for Vainilla & Descanso CRM */

export interface Room {
  id: string;
  name: string;
  room_type: string;
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning' | 'reserved';
  price: number;
  image: string | null;
}

export interface Guest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  id_number: string | null;
  origin: string | null;
  created_at: string;
}

export interface Reservation {
  id: string;
  room_id: string;
  guest_id: string | null;
  guest_name: string;
  check_in: string;
  check_out: string;
  /** Derived from check_in + check_out for UI compatibility */
  dates: string;
  total_price: number;
  notes: string | null;
  payment_status: string;
  status: string;
  external_id: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number | null;
  image: string | null;
  created_at: string;
}

export interface PosSale {
  id: string;
  items_json: string;
  total: number;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

export interface RoomCharge {
  id: string;
  room_id: string;
  guest_name: string;
  items_json: string;
  total: number;
  created_at: string;
}

export interface Feedback {
  id: string;
  guest_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  timestamp: string;
  read: boolean;
}

export interface Setting {
  key: string;
  value: string;
}

/** Cart item used in POS UI */
export interface CartItem {
  product: Product;
  quantity: number;
}
